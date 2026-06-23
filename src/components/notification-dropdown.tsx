import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationPreview = {
  id: string;
  title: string;
  detail?: string;
  timestamp?: string;
  priority?: string;
};

function priorityClass(priority?: string): string {
  if (priority === "critical") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (priority === "high" || priority === "warning")
    return "border-warning/40 bg-warning/15 text-warning-foreground";
  return "border-border bg-muted/50 text-muted-foreground";
}

export function NotificationDropdown({
  items,
  viewAllHref,
  viewAllLabel = "View All Notifications",
  unreadCount = 0,
  onMarkAllRead,
}: {
  items: NotificationPreview[];
  viewAllHref: string;
  viewAllLabel?: string;
  unreadCount?: number;
  onMarkAllRead?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const showBadge = unreadCount > 0 || items.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative shrink-0 rounded-lg"
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {showBadge ? (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-foreground" />
        ) : null}
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "Recent alerts and updates"}
              </p>
            </div>
            {onMarkAllRead && unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 text-xs"
                onClick={() => void onMarkAllRead()}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No recent notifications
              </p>
            ) : (
              <ul className="space-y-1">
                {items.slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      {item.priority ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] capitalize",
                            priorityClass(item.priority),
                          )}
                        >
                          {item.priority}
                        </span>
                      ) : null}
                    </div>
                    {item.detail ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
                    ) : null}
                    {item.timestamp ? (
                      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.timestamp}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              onClick={() => setOpen(false)}
            >
              <Link to={viewAllHref}>{viewAllLabel}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
