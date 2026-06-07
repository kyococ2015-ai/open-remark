"use client"

import {
  RiDashboardLine,
  RiGlobalLine,
  RiSettingsLine,
  RiMessage2Fill,
  RiAddLine,
  RiExpandUpDownLine,
} from "@remixicon/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

const mockUser = {
  name: "Alex Johnson",
  email: "alex@example.com",
  image: "https://github.com/shadcn.png",
}

const navItems = [
  { label: "Overview", href: "#", icon: RiDashboardLine, active: true },
  { label: "Sites", href: "#", icon: RiGlobalLine, active: false },
  { label: "Account", href: "#", icon: RiSettingsLine, active: false },
]

function MockSidebar() {
  const initials = mockUser.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex size-8 shrink-0 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
                  <RiMessage2Fill className="size-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold tracking-tight">
                    OpenRemark
                  </span>
                  <span className="text-xs font-normal text-sidebar-foreground/70">
                    Comment platform
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="group-data-[collapsible=icon]:px-0">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New site"
                  className="border-2 border-dashed border-primary/40 bg-primary/5 py-5 text-primary/70 transition-colors duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:text-sidebar-foreground hover:bg-primary/10 hover:text-primary group-data-[collapsible=icon]:hover:bg-primary/10 group-data-[collapsible=icon]:hover:text-primary"
                >
                  <a href="#">
                    <RiAddLine className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                      New site
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.active}
                    tooltip={item.label}
                  >
                    <a href="#">
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={mockUser.image} alt={mockUser.name} />
                <AvatarFallback className="bg-sidebar-primary/10 text-xs font-semibold text-sidebar-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden text-left leading-tight group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">
                  {mockUser.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/70">
                  {mockUser.email}
                </p>
              </div>
              <RiExpandUpDownLine
                className="ml-auto size-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export function DashboardTab() {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      style={{ height: 480 }}
    >
      <SidebarProvider>
        <MockSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              Overview
            </span>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-6">
            <p className="text-xs text-muted-foreground">
              Sidebar preview — use the trigger to collapse/expand.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {["Comments", "Sites", "Users"].map((label) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                    —
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
