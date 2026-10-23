"use client";

import { useQuery } from "@tanstack/react-query";
import { clinicalSnippetKeys } from "@/lib/query-keys";
import { clinicalSnippetService } from "@/services/clinical-snippet.service";

export function useClinicalSnippets(
  doctorId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: clinicalSnippetKeys.byDoctor(doctorId),
    queryFn: () => clinicalSnippetService.getAll(doctorId ?? undefined),
    enabled,
  });
}
