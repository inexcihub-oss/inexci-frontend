"use client";

import { useEffect, useState } from "react";
import { getAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import { uploadService } from "@/services/upload.service";

function getInitialsFromName(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AvatarOrInitials({
  user,
  size = 28,
}: {
  user: { id?: string; name: string; avatarUrl?: string | null };
  size?: number;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!user.avatarUrl) return;
    if (
      user.avatarUrl.startsWith("http://") ||
      user.avatarUrl.startsWith("https://")
    ) {
      setResolvedUrl(user.avatarUrl);
      return;
    }
    if (user.id) {
      const cached = getAvatarCache(user.id, user.avatarUrl);
      if (cached) {
        setResolvedUrl(cached);
        return;
      }
    }
    uploadService
      .getSignedUrl(user.avatarUrl)
      .then((url) => {
        if (user.id) setAvatarCache(user.id, user.avatarUrl!, url);
        setResolvedUrl(url);
      })
      .catch(() => setImgError(true));
  }, [user.avatarUrl, user.id]);

  if (resolvedUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedUrl}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitialsFromName(user.name)}
    </div>
  );
}
