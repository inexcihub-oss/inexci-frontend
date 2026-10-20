"use client";

import { useCallback, useRef, useState } from "react";

export function normalizeEmailTag(raw: string): string {
  return raw.trim().replace(/[;,]$/, "");
}

export interface EmailTagsState {
  tags: string[];
  input: string;
  setInput: (value: string) => void;
  setTags: (tags: string[]) => void;
  add: (email: string) => void;
  remove: (tag: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  reset: () => void;
}

export function useEmailTags(options?: {
  initial?: string[];
  onChange?: (tags: string[]) => void;
}): EmailTagsState {
  const [tags, setTagsState] = useState<string[]>(options?.initial ?? []);
  const [input, setInput] = useState("");
  const onChangeRef = useRef(options?.onChange);
  onChangeRef.current = options?.onChange;
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const commit = useCallback((next: string[]) => {
    tagsRef.current = next;
    setTagsState(next);
    onChangeRef.current?.(next);
  }, []);

  const add = useCallback(
    (email: string) => {
      const trimmed = normalizeEmailTag(email);
      if (trimmed && !tagsRef.current.includes(trimmed)) {
        commit([...tagsRef.current, trimmed]);
      }
      setInput("");
    },
    [commit],
  );

  const remove = useCallback(
    (tag: string) => commit(tagsRef.current.filter((t) => t !== tag)),
    [commit],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ";" || e.key === ",") {
        e.preventDefault();
        if (input.trim()) add(input);
      } else if (
        e.key === "Backspace" &&
        !input &&
        tagsRef.current.length > 0
      ) {
        commit(tagsRef.current.slice(0, -1));
      }
    },
    [input, add, commit],
  );

  const onBlur = useCallback(() => {
    if (input.trim()) add(input);
  }, [input, add]);

  const reset = useCallback(() => {
    commit([]);
    setInput("");
  }, [commit]);

  return {
    tags,
    input,
    setInput,
    setTags: commit,
    add,
    remove,
    onKeyDown,
    onBlur,
    reset,
  };
}
