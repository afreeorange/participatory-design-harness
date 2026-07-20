"use client";

import {
  RuntimeAdapterProvider,
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo } from "react";
import { readStore, writeStore, extractText } from "@/lib/client-store";

export const clientThreadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const store = readStore();
    // Auto-title untitled threads from first user message
    let dirty = false;
    for (const t of store.threads) {
      if (t.title) continue;
      const firstMsg = store.messages.find((m) => m.threadId === t.id);
      if (!firstMsg) continue;
      const text = extractText(firstMsg.content).trim();
      if (text) {
        t.title = text.slice(0, 50) + (text.length > 50 ? "…" : "");
        dirty = true;
      }
    }
    if (dirty) writeStore(store);
    return {
      threads: store.threads
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((t) => ({
          status: t.status as "regular" | "archived",
          remoteId: t.id,
          title: t.title ?? undefined,
        })),
    };
  },

  async initialize() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const store = readStore();
    store.threads.push({
      id,
      title: null,
      status: "regular",
      createdAt: now,
      updatedAt: now,
    });
    writeStore(store);
    return { remoteId: id, externalId: undefined };
  },

  async rename(remoteId, title) {
    const store = readStore();
    const t = store.threads.find((t) => t.id === remoteId);
    if (t) {
      t.title = title;
      t.updatedAt = new Date().toISOString();
      writeStore(store);
    }
  },

  async archive(remoteId) {
    const store = readStore();
    const t = store.threads.find((t) => t.id === remoteId);
    if (t) {
      t.status = "archived";
      t.updatedAt = new Date().toISOString();
      writeStore(store);
    }
  },

  async unarchive(remoteId) {
    const store = readStore();
    const t = store.threads.find((t) => t.id === remoteId);
    if (t) {
      t.status = "regular";
      t.updatedAt = new Date().toISOString();
      writeStore(store);
    }
  },

  async delete(remoteId) {
    const store = readStore();
    store.threads = store.threads.filter((t) => t.id !== remoteId);
    store.messages = store.messages.filter((m) => m.threadId !== remoteId);
    writeStore(store);
  },

  async fetch(remoteId) {
    const store = readStore();
    const t = store.threads.find((t) => t.id === remoteId);
    if (!t) throw new Error("Thread not found");
    return {
      status: t.status as "regular" | "archived",
      remoteId: t.id,
      title: t.title ?? undefined,
    };
  },

  async generateTitle(remoteId, messages) {
    const res = await fetch(`/api/threads/${remoteId}/title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const { title } = await res.json();
    return createAssistantStream(async (controller) => {
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
            if (!remoteId)
              return {
                messages: [] as import("@assistant-ui/react").MessageFormatItem<TMessage>[],
              };
            const store = readStore();
            const rows = store.messages
              .filter((m) => m.threadId === remoteId)
              .sort(
                (a, b) =>
                  new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
              ) as unknown as import("@assistant-ui/react").MessageStorageEntry<TStorageFormat>[];
            return { messages: rows.map((row) => fmt.decode(row)) };
          },
          async append(item: import("@assistant-ui/react").MessageFormatItem<TMessage>) {
            const { remoteId } = await aui.threadListItem().initialize();
            const store = readStore();
            const id = fmt.getId(item.message);
            const entry = {
              id,
              threadId: remoteId,
              parent_id: item.parentId,
              format: fmt.format,
              content: fmt.encode(item) as unknown,
              createdAt: new Date().toISOString(),
            };
            const idx = store.messages.findIndex((m) => m.id === id && m.threadId === remoteId);
            if (idx >= 0) {
              store.messages[idx] = entry;
            } else {
              store.messages.push(entry);
            }
            const thread = store.threads.find((t) => t.id === remoteId);
            if (thread) thread.updatedAt = new Date().toISOString();
            writeStore(store);
          },
        }),
      }),
      [aui],
    );
    return <RuntimeAdapterProvider adapters={{ history }}>{children}</RuntimeAdapterProvider>;
  },
};
