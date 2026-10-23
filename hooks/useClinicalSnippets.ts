"use client";

import { useQuery } from "@tanstack/react-query";
import { clinicalSnippetKeys } from "@/lib/query-keys";
import { clinicalSnippetService } from "@/services/clinical-snippet.service";

export function useClinicalSnippets(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: clinicalSnippetKeys.mine(userId),
    queryFn: () => clinicalSnippetService.getAll(),
    enabled: enabled && !!userId,
  });
}
