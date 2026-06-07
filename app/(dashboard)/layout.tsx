import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { getSiteCountByOwner } from "@/lib/services/site-service"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const siteCount = await getSiteCountByOwner(session.user.id!)

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} siteCount={siteCount} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
