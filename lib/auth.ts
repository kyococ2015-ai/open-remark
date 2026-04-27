import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    ...authConfig.callbacks,
    // With JWT strategy + database adapter: user is persisted in DB,
    // but session is carried in a signed JWT (not a DB session row).
    // The jwt callback runs first, then session.
    jwt({ token, user }) {
      // On initial sign-in `user` is populated; persist id into token.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
