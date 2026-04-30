import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { SiteSubNav } from "@/components/dashboard/site-sub-nav";

type Props = {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { siteId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session.user.id);
  } catch {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <SiteSubNav
        siteId={siteId}
        siteName={site.name}
        siteDomain={site.domain}
      />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
