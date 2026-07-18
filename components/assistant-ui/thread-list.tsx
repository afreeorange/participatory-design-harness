"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { useSidebar } from "@/components/ui/sidebar";
import { ArchiveIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, TrashIcon } from "lucide-react";
import {
  forwardRef,
  Fragment,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";

export const ThreadList: FC = () => {
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) {
    return (
      <ThreadListRoot className="items-center">
        <ThreadListPrimitive.New
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              data-slot="aui_thread-list-new"
              className="cursor-pointer"
              aria-label="New chat"
            />
          }
        >
          <PlusIcon className="size-4 text-primary" />
        </ThreadListPrimitive.New>
        {hasThreads && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label="Search"
            onClick={toggleSidebar}
          >
            <SearchIcon className="size-4 text-primary" />
          </Button>
        )}
      </ThreadListRoot>
    );
  }

  return (
    <ThreadListRoot>
      <ThreadListNew />
      {hasThreads && <ThreadListSearch value={search} onValueChange={setSearch} />}
      <ThreadListItems searchQuery={hasThreads ? search : ""} />
    </ThreadListRoot>
  );
};

export const ThreadListSearch = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange"> & {
    value: string;
    onValueChange: (value: string) => void;
  }
>(({ className, value, onValueChange, ...props }, ref) => {
  return (
    <div data-slot="aui_thread-list-search" className="relative px-0.5 py-1">
      <SearchIcon
        data-slot="aui_thread-list-search-icon"
        className="top-1/2 absolute size-4 text-primary -translate-y-1/2 pointer-events-none start-3"
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label="Search"
        placeholder="Search"
        className={cn("ps-8 h-8 placeholder:text-primary/50 text-sm", className)}
        {...props}
      />
    </div>
  );
});

ThreadListSearch.displayName = "ThreadListSearch";

export const ThreadListRoot: FC<ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>> = ({
  className,
  ...props
}) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
};

export const ThreadListItems: FC<ComponentPropsWithoutRef<"div"> & { searchQuery?: string }> = ({
  className,
  searchQuery = "",
  ...props
}) => {
  return (
    <div
      data-slot="aui_thread-list-items"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <AuiIf condition={(s) => s.threads.threadIds.length > 0}>
          <h1 className="opacity-50 mt-2 px-2.5 pt-3 pb-1 font-medium text-muted-foreground text-xs">
            Chat threads
          </h1>
        </AuiIf>
        <ThreadListItemGroups searchQuery={searchQuery} />
      </AuiIf>
    </div>
  );
};

const DAY_IN_MS = 86_400_000;

const dateGroupLabel = (date: Date | undefined, startOfToday: number): string => {
  if (!date || date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_IN_MS) return "Yesterday";
  return "Earlier";
};

type ThreadListGroup = { label: string; indices: number[] };

const ThreadListItemGroups: FC<{ searchQuery?: string }> = ({ searchQuery = "" }) => {
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const query = searchQuery.trim().toLowerCase();

  const { filteredIndices, groups } = useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
    const filteredIndices = threadIds
      .map((id, index) => ({ id, index }))
      .filter(
        ({ id }) =>
          !query || (itemsById.get(id)?.title || "New Chat").toLowerCase().includes(query),
      )
      .map(({ index }) => index);
    if (!filteredIndices.some((index) => dates[index])) {
      return { filteredIndices, groups: null };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const time = (index: number) => dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...filteredIndices].sort((a, b) => time(b) - time(a));

    const result: ThreadListGroup[] = [];
    for (const index of sorted) {
      const label = dateGroupLabel(dates[index], startOfToday);
      const lastGroup = result[result.length - 1];
      if (lastGroup?.label === label) {
        lastGroup.indices.push(index);
      } else {
        result.push({ label, indices: [index] });
      }
    }
    return { filteredIndices, groups: result };
  }, [threadIds, threadItems, query]);

  if (query && filteredIndices.length === 0) {
    return (
      <div data-slot="aui_thread-list-empty" className="px-2.5 py-4 text-muted-foreground text-sm">
        No threads found
      </div>
    );
  }

  if (!groups) {
    return filteredIndices.map((index) => {
      return (
        <Fragment key={threadIds[index]}>
          <ThreadListPrimitive.ItemByIndex index={index} components={{ ThreadListItem }} />
        </Fragment>
      );
    });
  }

  return groups.map((group) => (
    <Fragment key={group.label}>
      <div
        data-slot="aui_thread-list-group-label"
        className="px-2.5 pt-3 pb-1 font-medium text-muted-foreground text-xs"
      >
        {group.label}
      </div>
      {group.indices.map((index) => (
        <ThreadListPrimitive.ItemByIndex
          key={threadIds[index]}
          index={index}
          components={{ ThreadListItem }}
        />
      ))}
    </Fragment>
  ));
};

export const ThreadListNew = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { labelClassName?: string }
>(({ className, labelClassName, children, ...props }, ref) => {
  return (
    <ThreadListPrimitive.New
      render={
        <Button
          ref={ref}
          variant="ghost"
          data-slot="aui_thread-list-new"
          className={cn(
            "justify-start gap-2 px-2.5 hover:bg-border border-border rounded-md h-8 font-normal text-sm cursor-pointer",
            className,
          )}
          {...props}
        />
      }
    >
      {children ?? (
        <>
          <PlusIcon data-slot="aui_thread-list-new-icon" className="size-5 text-primary shrink-0" />
          <span
            data-slot="aui_thread-list-new-label"
            className={cn("whitespace-nowrap", labelClassName)}
          >
            New chat
          </span>
        </>
      )}
    </ThreadListPrimitive.New>
  );
});

ThreadListNew.displayName = "ThreadListNew";

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          data-slot="aui_thread-list-skeleton-wrapper"
          className="flex items-center px-2.5 h-8"
        >
          <Skeleton data-slot="aui_thread-list-skeleton" className="w-full h-3.5" />
        </div>
      ))}
    </div>
  );
};

export const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root
      data-slot="aui_thread-list-item"
      className="group relative flex items-center data-active:bg-muted has-data-[state=open]:bg-muted hover:bg-muted focus-visible:bg-muted has-focus-visible:bg-muted rounded-md focus-visible:outline-none h-8 transition-colors"
    >
      <ThreadListItemPrimitive.Trigger
        data-slot="aui_thread-list-item-trigger"
        className="flex flex-1 items-center px-2.5 group-data-active:pe-9 group-has-data-[state=open]:pe-9 group-has-focus-visible:pe-9 group-hover:pe-9 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 min-w-0 h-full text-sm text-start"
      >
        <span data-slot="aui_thread-list-item-title" className="flex-1 min-w-0 truncate">
          <ThreadListItemPrimitive.Title fallback="New Chat" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC = () => {
  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup>
      <ThreadListItemMorePrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-slot="aui_thread-list-item-more"
            className="top-1/2 absolute data-[state=open]:bg-accent opacity-0 data-[state=open]:opacity-100 group-data-active:opacity-100 group-has-focus-visible:opacity-100 group-hover:opacity-100 p-0 size-6 -translate-y-1/2 end-1.5"
          />
        }
      >
        <MoreHorizontalIcon className="size-3.5" />
        <span className="sr-only">More options</span>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        data-slot="aui_thread-list-item-more-content"
        className="data-[side=left]:slide-in-from-right-2 data-[side=top]:slide-in-from-bottom-2 z-50 bg-popover/95 data-[side=bottom]:slide-in-from-top-2 data-[side=right]:slide-in-from-left-2 shadow-lg backdrop-blur-sm p-1.5 border rounded-xl min-w-32 overflow-hidden text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      >
        <ThreadListItemPrimitive.Archive
          render={
            <ThreadListItemMorePrimitive.Item
              data-slot="aui_thread-list-item-more-item"
              className="flex items-center gap-2 hover:bg-accent focus:bg-accent px-2.5 py-1.5 rounded-lg outline-none text-sm hover:text-accent-foreground focus:text-accent-foreground cursor-pointer select-none"
            />
          }
        >
          <ArchiveIcon className="size-4" />
          Archive
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete
          render={
            <ThreadListItemMorePrimitive.Item
              data-slot="aui_thread-list-item-more-item"
              className="flex items-center gap-2 hover:bg-destructive/10 focus:bg-destructive/10 px-2.5 py-1.5 rounded-lg outline-none text-destructive hover:text-destructive focus:text-destructive text-sm cursor-pointer select-none"
            />
          }
        >
          <TrashIcon className="size-4" />
          Delete
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
