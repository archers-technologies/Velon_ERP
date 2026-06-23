import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/workspace/mutations";
import { loadWorkspaceAlerts } from "@/lib/workspace/loaders";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/alerts")({
  loader: () => loadWorkspaceAlerts(),
  component: AlertsPage,
});

function AlertsPage() {
  const router = useRouter();
  const notifications = Route.useLoaderData();
  const unread = notifications.filter((n) => !n.read).length;

  async function onMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      toast.success("Marked as read");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark notification as read");
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead();
      toast.success("All notifications marked as read");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark all as read");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All caught up"}
        </p>
        {unread > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void onMarkAllRead()}>
            Mark all read
          </Button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <Card className="border-border bg-card p-6">
          <div className="text-sm font-medium">No notifications</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Workspace activity and system updates will appear here.
          </p>
        </Card>
      ) : (
        notifications.map((notification) => (
          <Card key={notification.id} className="border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{notification.title}</div>
                {notification.body ? (
                  <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                ) : null}
                <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${notification.read ? "text-muted-foreground" : "border-info/25 bg-info/10 text-info"}`}
                >
                  {notification.read ? "Read" : "Unread"}
                </Badge>
                {!notification.read ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => void onMarkRead(notification.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
