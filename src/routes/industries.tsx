import { createFileRoute } from "@tanstack/react-router";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { Card } from "@/components/ui/card";
import { Store, Truck, Building2, Stethoscope, Factory, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/industries")({
  component: IndustriesPage,
});

function IndustriesPage() {
  const industries = [
    {
      icon: Store,
      name: "Retail",
      detail: "POS speed, inventory accuracy and customer repeat analytics.",
    },
    {
      icon: Truck,
      name: "Wholesale",
      detail: "Bulk invoicing, supplier dues and warehouse-level controls.",
    },
    {
      icon: Building2,
      name: "Multi-Branch",
      detail: "Branch switching, consolidated reports and permission matrix.",
    },
    {
      icon: Stethoscope,
      name: "Services",
      detail: "Appointment billing, recurring customers and ledger tracking.",
    },
    {
      icon: Factory,
      name: "SME Operations",
      detail: "Day-to-day finance visibility with low operational overhead.",
    },
    {
      icon: ShoppingBag,
      name: "Inventory Businesses",
      detail: "Stock movement, returns, damaged goods and valuation.",
    },
  ];

  return (
    <MarketingPageShell
      label="Industries"
      title="Universal ERP UX built for real business models"
      description="Velon-ERP adapts to how different businesses run, while keeping one clean and scalable interface pattern."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {industries.map((item) => (
          <Card key={item.name} className="border-border bg-card p-6">
            <item.icon className="h-5 w-5" />
            <h3 className="mt-4 text-lg font-semibold">{item.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          </Card>
        ))}
      </div>
    </MarketingPageShell>
  );
}
