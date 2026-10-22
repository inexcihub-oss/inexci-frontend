"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useClickOutside } from "@/hooks";
import { useNotificationsFeed } from "@/hooks/useNotificationsFeed";
import { cn } from "@/lib/utils";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";

interface NotificationsDropdownProps {
  isCollapsed?: boolean;
}

export default function NotificationsDropdown({
  isCollapsed = false,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const feed = useNotificationsFeed();
  const { unreadCount } = feed;

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) void feed.load();
  };

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "relative flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors min-h-[44px]",
          isOpen && "bg-gray-50 text-gray-900",
          isCollapsed ? "justify-center" : "",
        )}
        title={isCollapsed ? "Notificações" : undefined}
      >
        <span className="relative inline-flex shrink-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="hidden lg:flex absolute -top-1 -right-2 items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
              {badge}
            </span>
          )}
        </span>
        {!isCollapsed && <span>Notificações</span>}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full lg:hidden">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationsPanel
          notifications={feed.notifications}
          loading={feed.loading}
          unreadCount={unreadCount}
          onMarkAsRead={feed.markAsRead}
          onMarkAllAsRead={feed.markAllAsRead}
          onDelete={feed.remove}
          onClose={() => setIsOpen(false)}
          className={cn(
            "absolute bottom-full left-0 mb-2 w-[calc(100vw-2rem)] sm:w-96 z-[200]",
            isCollapsed && "lg:bottom-0 lg:left-full lg:mb-0 lg:ml-2",
          )}
        />
      )}
    </div>
  );
}
