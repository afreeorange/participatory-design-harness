import type * as React from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, Triangle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";

export function ThreadListSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} collapsible="icon" className="bg-muted">
      <SidebarHeader className="mb-2 border-b aui-sidebar-header">
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarContent className="px-2 aui-sidebar-content">
        <ThreadList />
      </SidebarContent>
    </Sidebar>
  );
}

function SidebarHeaderContent() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Expand sidebar">
          <PanelLeftOpenIcon className="size-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center aui-sidebar-header-content">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="flex justify-center items-center bg-sidebar-primary rounded-lg size-8 aspect-square text-sidebar-primary-foreground rotate-180 aui-sidebar-header-icon-wrapper">
              <Triangle className="size-4 aui-sidebar-header-icon" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none aui-sidebar-header-heading">
              <span className="font-semibold aui-sidebar-header-title">Phendo</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Collapse sidebar">
        <PanelLeftCloseIcon className="size-5" />
      </Button>
    </div>
  );
}
