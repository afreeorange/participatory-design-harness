"use client";

import type * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  Triangle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAui, useAuiState } from "@assistant-ui/react";
import { searchThreads as searchLocalThreads } from "@/lib/client-store";
import packageJson from "../../package.json";
import { PiCaretDownDuotone, PiGithubLogoDuotone } from "react-icons/pi";

export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} collapsible="icon" className="bg-muted">
      <SidebarHeader className="mb-2 border-b aui-sidebar-header">
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarContent className="px-2 aui-sidebar-content">
        <ThreadList />
      </SidebarContent>
      <SidebarFooter className="border-t aui-sidebar-footer">
        <div className="flex justify-between text-xs">
          <span className="opacity-50">v{packageJson.version}</span>
          <span className="opacity-50 hover:opacity-100">
            <a
              href="https://github.com/afreeorange/participatory-design-harness"
              title="View source on Github"
            >
              <PiGithubLogoDuotone className="inline size-3.5 align-top" />{" "}
              Source
            </a>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarHeaderContent() {
  const { state, toggleSidebar } = useSidebar();
  const aui = useAui();
  const collapsed = state === "collapsed";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpenIcon className="size-6" />
        </Button>
        <ThreadSearchDialog />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center aui-sidebar-header-content">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size={"lg"}
            className="cursor-pointer"
            onClick={() => aui.threads().switchToNewThread()}
          >
            <div className="flex justify-center items-center bg-sidebar-primary p-0 rounded-lg aspect-square text-sidebar-primary-foreground aui-sidebar-header-icon-wrapper">
              <PiCaretDownDuotone
                className="block"
                style={{
                  width: "calc(var(--spacing) * 8)",
                  height: "calc(var(--spacing) * 8)",
                }}
              />
            </div>
            {/* <div className="flex flex-col gap-0.5 leading-none aui-sidebar-header-heading">
              <span className="font-semibold aui-sidebar-header-title">
                Phendo
              </span>
            </div> */}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <div className="flex items-center gap-3">
        <ThreadSearchDialog />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
        >
          <PanelLeftCloseIcon className="size-6" />
        </Button>
      </div>
    </div>
  );
}

type SearchResult = {
  id: string;
  title: string | null;
  preview: string | null;
};

function ThreadSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const aui = useAui();
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timer = setTimeout(() => {
      if (process.env.NEXT_PUBLIC_CLIENT_STORAGE) {
        setResults(searchLocalThreads(q));
        setSearching(false);
      } else {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        fetch(`/api/threads/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
          .then((r) => r.json())
          .then((data: SearchResult[]) => {
            setResults(data);
            setSearching(false);
          })
          .catch(() => {});
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  if (!hasThreads) return null;

  const handleSelect = (remoteId: string) => {
    const item = threadItems.find((t) => t.remoteId === remoteId);
    if (item) aui.threads().switchToThread(item.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery("");
          setResults([]);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search chats"
            className="cursor-pointer"
          />
        }
      >
        <SearchIcon className="size-6" />
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <div className="relative">
          <SearchIcon className="top-1/2 left-3 absolute stroke-2 size-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-9 placeholder:text-primary/50"
            autoFocus
          />
        </div>
        {query.trim() && (
          <div className="flex flex-col gap-0.5 -mx-4 px-4 max-h-64 overflow-y-auto">
            {searching ? (
              <div className="py-4 text-muted-foreground text-sm text-center">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="py-4 text-muted-foreground text-sm text-center">
                Couldn't find any chats with that term. Try another?
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r.id)}
                  className="hover:bg-muted px-2.5 py-1.5 rounded-md text-left cursor-pointer"
                >
                  <div className="text-sm truncate">
                    {r.title || "New Chat"}
                  </div>
                  {r.preview && (
                    <div className="text-muted-foreground text-xs truncate">
                      {r.preview}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
