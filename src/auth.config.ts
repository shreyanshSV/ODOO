import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe config (no Prisma / bcrypt) — shared by middleware and the Node auth.
export const authConfig = {
  trustHost: true, // self-hosted: trust the deployment host (dev trusts localhost anyway)
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // the Credentials provider lives in auth.ts (needs Node)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role as Role;
        session.user.companyId = (token.companyId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
