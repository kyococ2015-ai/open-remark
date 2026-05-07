import { auth, signOut } from "@/lib/auth";

import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function AccountPage() {
  const session = await auth();
  const { name, email, image } = session!.user as { name: string; email: string; image: string | null };
  const initials = (name ?? email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div>
      <PageHeader title="Account" description="Your profile and sign-out" />
      <div className="p-6 max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Signed in via Google</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={image ?? ""} alt={name ?? ""} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
