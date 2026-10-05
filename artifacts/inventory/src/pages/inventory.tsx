import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { 
  useListProducts, 
  useDeleteProduct,
  getListProductsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetCategoryBreakdownQueryKey,
  getGetLowStockProductsQueryKey,
  getGetRecentProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  PlusCircle,
  ArrowUpDown,
  Filter,
  Package,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";

const CSV_TEMPLATE_HEADERS = "name,sku,category,description,quantity,price,reorderThreshold,supplier";

export default function Inventory() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "quantity" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors?: string[]; message: string } | null>(null);

  const queryParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    category: category && category !== "all" ? category : undefined,
    lowStock: lowStockOnly || undefined,
    sortBy,
    sortOrder
  }), [debouncedSearch, category, lowStockOnly, sortBy, sortOrder]);

  const { data: products, isLoading } = useListProducts(queryParams, { 
    query: { queryKey: getListProductsQueryKey(queryParams) } 
  });

  const { data: allProducts } = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey(undefined) }
  });

  const deleteMutation = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        toast.success("Product deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLowStockProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentProductsQueryKey() });
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error("Failed to delete product: " + ((error as any)?.error || "Unknown error"));
        setDeleteId(null);
      }
    }
  });

  const handleDelete = () => {
    if (deleteId) deleteMutation.mutate({ id: deleteId });
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const handleExport = () => {
    const source = allProducts ?? products;
    if (!source || source.length === 0) {
      toast.error("No products to export.");
      return;
    }

    const escape = (v: string | null | undefined) => {
      const s = v ?? "";
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = [
      CSV_TEMPLATE_HEADERS,
      ...source.map(p =>
        [
          escape(p.name),
          escape(p.sku),
          escape(p.category),
          escape(p.description),
          p.quantity,
          p.price,
          p.reorderThreshold,
          escape(p.supplier),
        ].join(",")
      ),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${source.length} product${source.length !== 1 ? "s" : ""} to CSV.`);
  };

  const handleDownloadTemplate = () => {
    const example = `${CSV_TEMPLATE_HEADERS}\nExample Widget,WDGT-001,Electronics,A sample product,50,29.99,10,Acme Supplies`;
    const blob = new Blob([example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch(`/api/products/import`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Import failed");
        setImportResult(null);
      } else {
        setImportResult(data);
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLowStockProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentProductsQueryKey() });
      }
    } catch {
      toast.error("Network error during import. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleImportDialogClose = (open: boolean) => {
    if (!open) {
      setImportFile(null);
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setImportDialogOpen(open);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage products, quantities, and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 bg-card/40 hover:bg-secondary/50"
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-csv"
          >
            <Upload size={14} /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 bg-card/40 hover:bg-secondary/50"
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <Download size={14} /> Export CSV
          </Button>
          <Link href="/inventory/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <PlusCircle size={15} /> Add Product
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card/40 backdrop-blur-md p-4 rounded-lg border border-border/50">
        <div className="flex-1 w-full flex items-center gap-2 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or SKU..." 
            className="pl-9 bg-background/50 border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] bg-background/50 border-border/50" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.length > 0 ? (
                  uniqueCategories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Components">Components</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-border/50">
            <Switch 
              id="low-stock" 
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
              className="data-[state=checked]:bg-amber-500"
              data-testid="switch-low-stock"
            />
            <Label htmlFor="low-stock" className="text-sm cursor-pointer whitespace-nowrap">Low Stock Only</Label>
          </div>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[80px]">SKU</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => toggleSort("name")} className="flex items-center gap-1 -ml-4 h-8 font-medium">
                  Product <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => toggleSort("quantity")} className="flex items-center gap-1 ml-auto -mr-4 h-8 font-medium">
                  Stock <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => toggleSort("price")} className="flex items-center gap-1 ml-auto -mr-4 h-8 font-medium">
                  Price <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px] text-center">Status</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Package className="h-8 w-8 mb-2 opacity-20" />
                    <p>No products found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id} data-testid={`row-product-${product.id}`} className="border-border/50 hover:bg-secondary/40 transition-colors group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-secondary/50 font-normal">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={product.quantity <= product.reorderThreshold ? (product.quantity === 0 ? "text-rose-500" : "text-amber-500") : ""}>
                      {product.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="text-center">
                    {product.quantity === 0 ? (
                      <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 whitespace-nowrap">
                        Out of Stock
                      </Badge>
                    ) : product.quantity <= product.reorderThreshold ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 whitespace-nowrap">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 whitespace-nowrap">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <Link href={`/inventory/${product.id}/edit`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV dialog */}
      <Dialog open={importDialogOpen} onOpenChange={handleImportDialogClose}>
        <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Import Products from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk-import or update products. Existing SKUs will be updated in place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template download */}
            <div className="flex items-center justify-between rounded-md bg-secondary/30 border border-border/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download the CSV format with an example row</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={handleDownloadTemplate}>
                <Download size={13} /> Template
              </Button>
            </div>

            {/* Required columns */}
            <div className="rounded-md bg-secondary/20 border border-border/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Required columns:</p>
              <p className="font-mono">name, sku, category, quantity, price, reorderThreshold</p>
              <p className="font-medium text-foreground pt-1">Optional columns:</p>
              <p className="font-mono">description, supplier</p>
            </div>

            {/* File picker */}
            <div
              className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 bg-secondary/10 p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-import"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                data-testid="input-csv-file"
              />
              <Upload className="h-8 w-8 text-muted-foreground" />
              {importFile ? (
                <>
                  <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Click to choose a CSV file</p>
                  <p className="text-xs text-muted-foreground">or drag and drop here · Max 5 MB</p>
                </>
              )}
            </div>

            {/* Result */}
            {importResult && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-emerald-400">{importResult.message}</p>
                {importResult.skipped > 0 && (
                  <p className="text-xs text-muted-foreground">{importResult.skipped} row(s) skipped due to validation errors.</p>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="text-xs text-rose-400 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => handleImportDialogClose(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="gap-2"
              data-testid="button-confirm-import"
            >
              {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload size={14} /> Import</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
