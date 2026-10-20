import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadService } from "@/services/upload.service";
import { getAvatarCache, setAvatarCache } from "@/lib/avatar-cache";
import { logger } from "@/lib/logger";

export function useUserAvatarUrl(): string | null {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const raw = user?.avatarUrl;
  const userId = user?.id;

  useEffect(() => {
    if (!raw || !userId) {
      setAvatarUrl(null);
      return;
    }

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      setAvatarUrl(raw);
      setAvatarCache(userId, raw, raw);
      return;
    }

    const cached = getAvatarCache(userId, raw);
    if (cached) {
      setAvatarUrl(cached);
      return;
    }

    let active = true;
    uploadService
      .getSignedUrl(raw)
      .then((url) => {
        if (!active) return;
        setAvatarUrl(url);
        setAvatarCache(userId, raw, url);
      })
      .catch((error) => {
        logger.warn("Não foi possível assinar a URL do avatar:", error);
        if (active) setAvatarUrl(null);
      });
    return () => {
      active = false;
    };
  }, [raw, userId]);

  return avatarUrl;
}
