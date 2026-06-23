import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Boxes, FolderTree, Package, Warehouse } from "lucide-react";

const inventoryNav = [
  { to: "/app/inventory", label: "Stock", exact: true, icon: Boxes },
  { to: "/app/inventory/products", label: "Products", icon: Package },
  { to: "/app/inventory/categories", label: "Categories", icon: FolderTree },
  { to: "/app/inventory/warehouses", label: "Warehouses", icon: Warehouse },
] as const;

export const Route = createFileRoute("/app/inventory")({
  component: InventoryLayout,
});

function InventoryLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Product master, categories, warehouses, and live stock — tenant-scoped.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {inventoryNav.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === "/app/inventory" || pathname === "/app/inventory/"
              : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
