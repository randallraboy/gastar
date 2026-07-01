import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    error: "/not-authorized",
  },
  callbacks: {
    async signIn({ account, profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || !getAllowedEmails().has(email)) {
        return false;
      }

      if (account?.provider === "google" && profile?.sub) {
        const db = getDb();
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.googleSub, profile.sub))
          .limit(1);

        if (!existing) {
          await db.insert(users).values({
            googleSub: profile.sub,
            email,
            displayName: profile.name ?? email,
          });
        }
      }

      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      }
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
