import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useState } from "react";

import { fmtDateTime } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/portal.functions";
import { notificationsQueryOptions } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(notificationsQueryOptions);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  async function handleClick(notification: (typeof notifications)[number]) {
    if (!notification.read_at) {
      try {
        await markRead({ data: { id: notification.id } });
        await queryClient.invalidateQueries({ queryKey: ["portal"] });
      } catch {
        // silencioso: la campana se actualizará en el próximo refetch
      }
    }
    const serviceId = (
      notification.metadata as { service_id?: string } | null | undefined
    )?.service_id;
    if (typeof serviceId === "string") {
      setOpen(false);
      navigate({ to: "/portal/servicio/$id", params: { id: serviceId } });
    }
  }

  async function handleMarkAll() {
    try {
      await markAll();
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    } catch {
      // silencioso
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
        >
          {unread > 0 ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como leídas
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tienes notificaciones por ahora.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border/60">
              {notifications.slice(0, 15).map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleClick(notification)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.read_at ? "bg-transparent" : "bg-primary"
                      }`}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm ${
                          notification.read_at
                            ? "font-medium text-muted-foreground"
                            : "font-semibold"
                        }`}
                      >
                        {notification.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {notification.content}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground/70">
                        {fmtDateTime(notification.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
