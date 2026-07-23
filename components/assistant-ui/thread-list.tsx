"use client";

import { Button } from "@/components/ui/button";
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
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import {
  forwardRef,
  Fragment,
  useMemo,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";
import { DAY_IN_MS } from "@/app/constants";

export const ThreadList: FC = () => {
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

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
          <PlusIcon className="size-6 text-primary" />
        </ThreadListPrimitive.New>
      </ThreadListRoot>
    );
  }

  return (
    <ThreadListRoot>
      <ThreadListNew />
      <ThreadListItems />
    </ThreadListRoot>
  );
};

export const ThreadListRoot: FC<
  ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>
> = ({ className, ...props }) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
};

export const ThreadListItems: FC<ComponentPropsWithoutRef<"div">> = ({
  className,
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
        <ThreadListItemGroups />
      </AuiIf>
    </div>
  );
};

const dateGroupLabel = (
  date: Date | undefined,
  startOfToday: number,
): string => {
  if (!date || date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_IN_MS) return "Yesterday";
  return "Earlier";
};

type ThreadListGroup = { label: string; indices: number[] };

const ThreadListItemGroups: FC = () => {
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const groups = useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
    const allIndices = threadIds.map((_, i) => i);

    if (!allIndices.some((i) => dates[i])) return null;

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const time = (index: number) =>
      dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...allIndices].sort((a, b) => time(b) - time(a));

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
    return result;
  }, [threadIds, threadItems]);

  if (!groups) {
    return threadIds.map((id, index) => (
      <Fragment key={id}>
        <ThreadListPrimitive.ItemByIndex
          index={index}
          components={{ ThreadListItem }}
        />
      </Fragment>
    ));
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
  const { setOpenMobile } = useSidebar();

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
          onClick={() => setOpenMobile(false)}
          {...props}
        />
      }
    >
      {children ?? (
        <>
          <PlusIcon
            data-slot="aui_thread-list-new-icon"
            className="size-6 text-primary shrink-0"
          />
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
          <Skeleton
            data-slot="aui_thread-list-skeleton"
            className="w-full h-3.5"
          />
        </div>
      ))}
    </div>
  );
};

export const ThreadListItem: FC = () => {
  const { setOpenMobile } = useSidebar();

  return (
    <ThreadListItemPrimitive.Root
      data-slot="aui_thread-list-item"
      className="group relative flex items-center data-active:bg-muted has-data-[state=open]:bg-muted hover:bg-muted focus-visible:bg-muted has-focus-visible:bg-muted rounded-md focus-visible:outline-none h-8 transition-colors"
    >
      <ThreadListItemPrimitive.Trigger
        data-slot="aui_thread-list-item-trigger"
        className="flex flex-1 items-center px-2.5 group-data-active:pe-9 group-has-data-[state=open]:pe-9 group-has-focus-visible:pe-9 group-hover:pe-9 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 min-w-0 h-full text-sm text-start"
        onClick={() => setOpenMobile(false)}
      >
        <span
          data-slot="aui_thread-list-item-title"
          className="flex-1 min-w-0 truncate hover:text-accent-foreground cursor-pointer"
        >
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
