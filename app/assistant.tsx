"use client";

import { AssistantRuntimeProvider, useRemoteThreadListRuntime, useAui, useAuiState } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { threadListAdapter } from "./thread-adapter";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { useEffect, useRef, type FC } from "react";

const ThreadRouter: FC = () => {
  const aui = useAui();
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const isLoading = useAuiState((s) => s.threads.isLoading);
  const restoredRef = useRef(false);
  const suppressPushRef = useRef(false);

  // On mount after thread list loads: restore thread from URL
  useEffect(() => {
    if (isLoading || restoredRef.current) return;
    restoredRef.current = true;

    const match = window.location.pathname.match(/^\/thread\/(.+)$/);
    if (!match) return;

    const remoteId = match[1];
    const items = aui.threads().getState().threadItems;
    const item = items.find((t) => t.remoteId === remoteId);
    if (item) {
      suppressPushRef.current = true;
      aui.threads().switchToThread(item.id);
    }
  }, [isLoading, aui]);

  // Sync URL when active thread or its remoteId changes
  const remoteId = useAuiState(
    (s) => s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)?.remoteId,
  );

  useEffect(() => {
    if (!restoredRef.current) return;
    if (suppressPushRef.current) {
      suppressPushRef.current = false;
      return;
    }

    const path = remoteId ? `/thread/${remoteId}` : "/";
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  }, [mainThreadId, remoteId]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/thread\/(.+)$/);
      if (match) {
        const remoteId = match[1];
        const items = aui.threads().getState().threadItems;
        const item = items.find((t) => t.remoteId === remoteId);
        if (item) {
          suppressPushRef.current = true;
          aui.threads().switchToThread(item.id);
        }
      } else {
        suppressPushRef.current = true;
        aui.threads().switchToNewThread();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [aui]);

  return null;
};

export const Assistant = () => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => useChatRuntime(),
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadRouter />
      <SidebarProvider>
        <ThreadListSidebar />
        <SidebarInset>
          <div className="h-dvh">
            <Thread />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
