import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { LayoutDashboard, LogOut, Package, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const accountName = user?.fullName || user?.username || "Signed in";
  const accountEmail = user?.primaryEmailAddress?.emailAddress;
  const avatarLetter =
    user?.firstName?.slice(0, 1) ||
    accountEmail?.slice(0, 1).toUpperCase() ||
    "A";

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/inventory/new", label: "Add Product", icon: PlusCircle },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 font-semibold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <Package size={18} strokeWidth={2.5} />
            </div>
            <span>SmartInv</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer group relative overflow-hidden",
                    isActive 
                      ? "text-primary-foreground bg-primary/90 shadow-[0_4px_12px_rgba(79,70,229,0.3)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Icon size={18} className={cn("transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/50 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {accountName}
              </p>
              {accountEmail && (
                <p className="truncate text-xs text-muted-foreground">
                  {accountEmail}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              signOut({
                redirectUrl: basePath ? `${basePath}/login` : "/login",
              })
            }
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl flex items-center px-4 md:hidden">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Package size={14} />
            </div>
            <span>SmartInv</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
