"use client";

import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { threadListAdapter } from "./thread-adapter";
import { clientThreadListAdapter } from "./client-thread-adapter";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { useEffect, useRef, type FC } from "react";
import { PanelLeftOpenIcon } from "lucide-react";

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
    } else {
      window.history.replaceState(null, "", "/");
    }
  }, [isLoading, aui]);

  // Sync URL when active thread or its remoteId changes
  const remoteId = useAuiState(
    (s) =>
      s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)
        ?.remoteId,
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

const MobileSidebarTrigger: FC = () => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="md:hidden top-3 left-3 z-20 absolute hover:bg-muted p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Open sidebar"
    >
      <PanelLeftOpenIcon className="size-6" />
    </button>
  );
};

export const Assistant = () => {
  const adapter = process.env.NEXT_PUBLIC_CLIENT_STORAGE
    ? clientThreadListAdapter
    : threadListAdapter;

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => useChatRuntime(),
    adapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadRouter />
      <SidebarProvider>
        <ThreadListSidebar />
        <SidebarInset>
          <div className="relative h-dvh">
            <MobileSidebarTrigger />
            <Thread />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
