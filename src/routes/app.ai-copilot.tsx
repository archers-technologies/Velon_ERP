import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/ai-copilot")({
  component: AiCopilotPage,
});

function AiCopilotPage() {
  return (
    <Card className="border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Velon AI Assistant</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Try: "Show overdue customers above $1000" or "Top selling products this month"
      </p>
      <div className="mt-4 flex gap-2">
        <Input placeholder="Ask anything about your business..." />
        <Button className="bg-foreground text-background hover:bg-foreground/90">Ask</Button>
      </div>
    </Card>
  );
}
