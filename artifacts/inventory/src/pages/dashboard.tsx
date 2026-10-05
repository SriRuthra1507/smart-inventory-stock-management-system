import { 
  useGetDashboardSummary, 
  useGetCategoryBreakdown, 
  useGetLowStockProducts, 
  useGetRecentProducts,
  getGetDashboardSummaryQueryKey,
  getGetCategoryBreakdownQueryKey,
  getGetLowStockProductsQueryKey,
  getGetRecentProductsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, AlertTriangle, XCircle, ArrowUpRight, Clock } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Cell as PieCell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: categories, isLoading: isLoadingCategories } = useGetCategoryBreakdown({ query: { queryKey: getGetCategoryBreakdownQueryKey() } });
  const { data: lowStock, isLoading: isLoadingLowStock } = useGetLowStockProducts({ query: { queryKey: getGetLowStockProductsQueryKey() } });
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentProducts({ query: { queryKey: getGetRecentProductsQueryKey() } });

  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E'];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time inventory overview and alerts.</p>
        </div>
        <Link href="/inventory/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <Package size={16} /> Add Product
        </Link>
      </div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-border/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Package size={64} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <div className="text-3xl font-bold">{summary?.totalProducts || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-border/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign size={64} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-3xl font-bold">{formatCurrency(summary?.totalStockValue || 0)}</div>
                  <p className="text-xs text-emerald-500 mt-1 flex items-center"><ArrowUpRight size={12} className="mr-1"/> Total capital invested</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
              <AlertTriangle size={64} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500/80">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-3xl font-bold text-amber-500">{summary?.lowStockCount || 0}</div>
                  <p className="text-xs text-amber-500/70 mt-1">Items below threshold</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-card/40 backdrop-blur-md border-rose-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500">
              <XCircle size={64} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-500/80">Out of Stock</CardTitle>
              <XCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-3xl font-bold text-rose-500">{summary?.outOfStockCount || 0}</div>
                  <p className="text-xs text-rose-500/70 mt-1">Immediate action needed</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Charts */}
        <Card className="col-span-4 bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            {isLoadingCategories ? (
              <div className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full ml-4" /></div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="productCount" radius={[4, 4, 0, 0]}>
                      {categories?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="col-span-3 bg-card/40 backdrop-blur-md border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {isLoadingLowStock ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {lowStock?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <Package className="h-12 w-12 mb-4 opacity-20" />
                    <p>All stock levels look good.</p>
                  </div>
                ) : (
                  lowStock?.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-secondary/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]" title={product.name}>{product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.sku}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={cn("font-bold text-sm", product.quantity === 0 ? "text-rose-500" : "text-amber-500")}>
                            {product.quantity} left
                          </div>
                          <div className="text-xs text-muted-foreground">Threshold: {product.reorderThreshold}</div>
                        </div>
                        <Badge variant={product.quantity === 0 ? "destructive" : "outline"} className={cn(
                          product.quantity > 0 && "border-amber-500/30 text-amber-500 bg-amber-500/10"
                        )}>
                          {product.quantity === 0 ? "Out" : "Low"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card/40 backdrop-blur-md border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recently Added Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {recent?.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">No recent products.</div>
              ) : (
                recent?.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-background/50 hover:bg-secondary/40 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-muted-foreground">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.category} • Added {formatDate(product.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(product.price)}</div>
                      <Badge variant="outline" className="mt-1 bg-background text-xs font-normal">
                        Qty: {product.quantity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
