import NotificationActorAvatar from "@/components/notifications/NotificationActorAvatar";
import { cn } from "@/lib/utils";
import {
  getNotificationActor,
  getNotificationKind,
  NOTIFICATION_KIND_META,
} from "@/lib/notifications";
import type { Notification } from "@/services/notification.service";

interface NotificationIconProps {
  notification: Notification;
  size?: "sm" | "md";
  className?: string;
}

export default function NotificationIcon({
  notification,
  size = "sm",
  className,
}: NotificationIconProps) {
  const box = size === "md" ? "w-10 h-10" : "w-9 h-9";
  const actor = getNotificationActor(notification);

  if (actor) {
    return (
      <NotificationActorAvatar
        actorId={actor.actorId}
        actorName={actor.actorName}
        actorAvatarUrl={actor.actorAvatarUrl}
        className={cn(box, "rounded-full text-xs", className)}
      />
    );
  }

  const kind = getNotificationKind(notification);
  const { icon: Icon, tile } = NOTIFICATION_KIND_META[kind];

  return (
    <span
      data-notification-kind={kind}
      aria-hidden="true"
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-full",
        box,
        tile,
        className,
      )}
    >
      <Icon className={size === "md" ? "w-5 h-5" : "w-[18px] h-[18px]"} />
    </span>
  );
}
