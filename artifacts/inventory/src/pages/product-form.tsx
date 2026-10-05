import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useCreateProduct, 
  useUpdateProduct, 
  useGetProduct,
  getGetProductQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Use same schema as API but we define it here for client validation
const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  category: z.string().min(2, "Category is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  reorderThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
  supplier: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  
  // Param handling logic from rules
  const isNew = !params.id || params.id === "new";
  const productId = isNew ? null : parseInt(params.id!);

  const { data: product, isLoading: isFetching } = useGetProduct(
    productId!, 
    { query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId!) } }
  );

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        toast.success("Product created successfully");
        queryClient.invalidateQueries({ queryKey: [ `/api/products` ] });
        queryClient.invalidateQueries({ queryKey: [ `/api/dashboard` ] });
        setLocation("/inventory");
      },
      onError: (error) => {
        toast.error("Failed to create product: " + ((error as any)?.error || "Unknown error"));
      }
    }
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast.success("Product updated successfully");
        queryClient.invalidateQueries({ queryKey: [ `/api/products` ] });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId!) });
        queryClient.invalidateQueries({ queryKey: [ `/api/dashboard` ] });
        setLocation("/inventory");
      },
      onError: (error) => {
        toast.error("Failed to update product: " + ((error as any)?.error || "Unknown error"));
      }
    }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      description: "",
      quantity: 0,
      price: 0.00,
      reorderThreshold: 10,
      supplier: "",
    },
  });

  // Reset form when product loads
  useEffect(() => {
    if (product && !isNew) {
      form.reset({
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description || "",
        quantity: product.quantity,
        price: product.price,
        reorderThreshold: product.reorderThreshold,
        supplier: product.supplier || "",
      });
    }
  }, [product, isNew, form]);

  const onSubmit = (data: ProductFormValues) => {
    if (isNew) {
      createMutation.mutate({ data });
    } else {
      // For updates, we can send partial data or full data
      updateMutation.mutate({ id: productId!, data });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isFetching) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 bg-card/40 border-border/50 hover:bg-secondary"
          onClick={() => setLocation("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Add New Product" : "Edit Product"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isNew ? "Create a new item in your inventory." : `Update details for ${product?.name || 'this item'}.`}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core product details and identification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ergonomic Office Chair" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FUR-CHR-001" className="bg-background/50 font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Furniture" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Corp" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed product description..." 
                        className="bg-background/50 min-h-[100px] resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Inventory & Pricing</CardTitle>
              <CardDescription>Stock levels, thresholds, and financial details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorderThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Threshold</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Alert triggers below this level.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              className="bg-card border-border/50 hover:bg-secondary"
              onClick={() => setLocation("/inventory")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(79,70,229,0.3)] min-w-[120px]"
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> {isNew ? "Create Product" : "Save Changes"}</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
