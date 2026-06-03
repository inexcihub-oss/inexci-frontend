"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import { getAvatarColor, getInitials, cn } from "@/lib/utils";
import { uploadService } from "@/services/upload.service";

interface NotificationActorAvatarProps {
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  className?: string;
}

export default function NotificationActorAvatar({
  actorId,
  actorName,
  actorAvatarUrl,
  className,
}: NotificationActorAvatarProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const name = actorName?.trim() || "Usuário";

  useEffect(() => {
    let isMounted = true;

    const raw = actorAvatarUrl?.trim();
    if (!raw) {
      setResolvedUrl(null);
      return () => {
        isMounted = false;
      };
    }

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      setResolvedUrl(raw);
      if (actorId) {
        setAvatarCache(actorId, raw, raw);
      }
      return () => {
        isMounted = false;
      };
    }

    if (actorId) {
      const cached = getAvatarCache(actorId, raw);
      if (cached) {
        setResolvedUrl(cached);
        return () => {
          isMounted = false;
        };
      }
    }

    uploadService
      .getSignedUrl(raw)
      .then((url) => {
        if (!isMounted) return;
        setResolvedUrl(url);
        if (actorId) {
          setAvatarCache(actorId, raw, url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [actorAvatarUrl, actorId]);

  if (resolvedUrl) {
    return (
      <Image
        src={resolvedUrl}
        alt={name}
        width={32}
        height={32}
        className={cn("w-8 h-8 rounded-xl object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-semibold",
        getAvatarColor(name),
        className,
      )}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
