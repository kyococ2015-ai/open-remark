"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  RiDashboardLine,
  RiGlobalLine,
  RiSettingsLine,
  RiLogoutBoxLine,
  RiExpandUpDownLine,
  RiAddLine,
  RiMessage2Fill,
} from "@remixicon/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: RiDashboardLine },
  { label: "Sites", href: "/dashboard/sites", icon: RiGlobalLine },
  { label: "Account", href: "/dashboard/account", icon: RiSettingsLine },
]

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function AppSidebar({ user }: Props) {
  const pathname = usePathname()
  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      {/* ── Header ──────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent active:bg-transparent"
            >
              <Link href="/dashboard/sites">
                {/* Logo mark */}
                <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm">
                  <RiMessage2Fill className="size-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold tracking-tight">
                    Open Remark
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Comment platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── New site shortcut ────────────────────────────── */}
      <div className="px-3 pb-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/dashboard/sites/new"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:text-sidebar-foreground"
          title="New site"
        >
          <RiAddLine className="size-4 shrink-0" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">New site</span>
        </Link>
      </div>

      <SidebarSeparator className="mx-3 w-auto bg-sidebar-border/50" />

      {/* ── Nav ─────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup className="px-3 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="relative rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&_svg]:text-sidebar-primary"
                    >
                      <Link href={item.href}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer / user ───────────────────────────────── */}
      <SidebarFooter>
        <SidebarSeparator className="-mx-0 mb-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <RiExpandUpDownLine
                    className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden"
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={4}
                className="w-56"
              >
                <DropdownMenuLabel className="py-2 font-normal">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account">
                    <RiSettingsLine className="size-4" aria-hidden="true" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => signOut({ callbackUrl: "/sign-in" })}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <RiLogoutBoxLine className="size-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
