import { parseApiDate } from "@/lib/formatters";
import {
  formatNotificationFullDate,
  formatNotificationTime,
} from "@/lib/notifications";

interface NotificationTimeProps {
  createdAt: string;
  className?: string;
}

export default function NotificationTime({
  createdAt,
  className,
}: NotificationTimeProps) {
  const date = parseApiDate(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time
      dateTime={date.toISOString()}
      title={formatNotificationFullDate(date)}
      className={className}
    >
      {formatNotificationTime(date)}
    </time>
  );
}
