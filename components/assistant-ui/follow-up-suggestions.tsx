"use client";

import { AuiIf, useAuiState, ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";

export const ThreadFollowupSuggestions: FC = () => {
  const suggestions = useAuiState((s) => s.thread.suggestions);

  return (
    <AuiIf
      condition={(s) =>
        !s.thread.isEmpty &&
        !s.thread.isRunning &&
        s.thread.suggestions.length > 0
      }
    >
      <div className="flex justify-center items-center gap-2 min-h-8 aui-thread-followup-suggestions">
        {suggestions.map((suggestion, idx) => (
          <ThreadPrimitive.Suggestion
            key={idx}
            className="bg-background hover:bg-muted/80 px-3 py-1 border rounded-full text-sm transition-colors ease-in aui-thread-followup-suggestion"
            prompt={suggestion.prompt}
            method="replace"
            autoSend
          >
            {suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </AuiIf>
  );
};
