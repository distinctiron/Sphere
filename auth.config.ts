import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },
    async signIn({ user, account, profile, email }) {
      // Allow sign in for OAuth providers
      if (account?.provider === "google" || account?.provider === "apple" || account?.provider === "facebook") {
        return true;
      }
      // For credentials provider, authorization is handled in the authorize function
      return true;
    },
  },
  events: {
    // Story 6.4: remember when the user was last here so the dashboard can show
    // papers pre-processed since then. Runs for every provider.
    async signIn({ user }) {
      if (!user?.id) return;
      try {
        const current = await db.user.findUnique({
          where: { id: user.id },
          select: { lastFetchTimestamp: true },
        });
        // signIn can fire more than once per login; re-logins within a few
        // minutes keep the existing "new since" window instead of emptying it
        const last = current?.lastFetchTimestamp?.getTime();
        if (last && Date.now() - last < 5 * 60 * 1000) return;
        await db.user.update({
          where: { id: user.id },
          data: { newPapersSince: current?.lastFetchTimestamp ?? null, lastFetchTimestamp: new Date() },
        });
      } catch (error) {
        console.error("Failed to update login timestamps:", error);
      }
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

