"use client";

import {
  RuntimeAdapterProvider,
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo } from "react";

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const rows = await fetch("/api/threads").then((r) => r.json());
    return {
      threads: rows.map((t: { id: string; status: string; title: string | null }) => ({
        status: t.status as "regular" | "archived",
        remoteId: t.id,
        title: t.title ?? undefined,
      })),
    };
  },
  async initialize(_threadId: string) {
    const { id } = await fetch("/api/threads", { method: "POST" }).then((r) =>
      r.json(),
    );
    return { remoteId: id, externalId: undefined };
  },
  async rename(remoteId, title) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },
  async archive(remoteId) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });
  },
  async unarchive(remoteId) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "regular" }),
    });
  },
  async delete(remoteId) {
    await fetch(`/api/threads/${remoteId}`, { method: "DELETE" });
  },
  async fetch(remoteId) {
    const t = await fetch(`/api/threads/${remoteId}`).then((r) => r.json());
    return {
      status: t.status as "regular" | "archived",
      remoteId: t.id,
      title: t.title ?? undefined,
    };
  },
  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      const { title } = await fetch(`/api/threads/${remoteId}/title`, {
        method: "POST",
        body: JSON.stringify({ messages }),
      }).then((r) => r.json());
      controller.appendText(title);
    });
  },
  unstable_Provider({ children }) {
    const aui = useAui();
    const history = useMemo<ThreadHistoryAdapter>(
      () => ({
        async load() {
          return { messages: [] };
        },
        async append() {},
        withFormat: <TMessage, TStorageFormat extends Record<string, unknown>>(
          fmt: import("@assistant-ui/react").MessageFormatAdapter<TMessage, TStorageFormat>,
        ) => ({
          async load() {
            const { remoteId } = aui.threadListItem().getState();
            if (!remoteId) return { messages: [] as import("@assistant-ui/react").MessageFormatItem<TMessage>[] };
            const rows: import("@assistant-ui/react").MessageStorageEntry<TStorageFormat>[] =
              await fetch(`/api/threads/${remoteId}/messages`).then((r) => r.json());
            return {
              messages: rows.map((row) => fmt.decode(row)),
            };
          },
          async append(item: import("@assistant-ui/react").MessageFormatItem<TMessage>) {
            const { remoteId } = await aui.threadListItem().initialize();
            await fetch(`/api/threads/${remoteId}/messages`, {
              method: "POST",
              body: JSON.stringify({
                id: fmt.getId(item.message),
                parent_id: item.parentId,
                format: fmt.format,
                content: fmt.encode(item),
              }),
            });
          },
        }),
      }),
      [aui],
    );
    return (
      <RuntimeAdapterProvider adapters={{ history }}>
        {children}
      </RuntimeAdapterProvider>
    );
  },
};
