import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcrypt-ts-edge";
import type { NextAuthConfig } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const config = {
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (credentials === null) return null;

        //Find user in database

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        });

        // check if user exist and if password matches

        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );
          // if password is correct return the user

          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        // if user doesn't exist or password doesn't match return null
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user, trigger, token }: any) {
      // set the user id from the token
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;

      // if there is an update, set the user name
      if (trigger === "update") {
        session.user.name = user.name;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }: any) {
      // assign user fields to the token
      if (user) {
        token.role = user.role;

        // if user has no name,then use email
        if (user.name === "NO NAME") {
          token.name = user.email!.split("@")[0];
          // update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }
        if (trigger === "signIn" || trigger === "signUp") {
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get("sessionCartId")?.value;

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findFirst({
              where: { sessionCartId },
            });
            if (sessionCart) {
              // delete current user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id },
              });
              // assign new cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              });
            }
          }
        }
      }
      return token;
    },
    authorized({ request, auth }: any) {
      //Array regex patterns of path we want to protect
      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ];

      // Get pathname from the request URL object
      const { pathname } = request.nextUrl;
      // Check if user not authenticated and accessing a protected path
      if (
        (!auth || !auth.user) &&
        protectedPaths.some((p) => p.test(pathname))
      ) {
        return false;
      }
      if (!request.cookies.get("sessionCartId")) {
        // Check for session cookie;
        // generate new session cartId cookie
        const sessionCartId = crypto.randomUUID();
        //clone request headers
        const newRequestHeaders = new Headers(request.headers);
        // create new response and add new headers
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders,
          },
        });
        // set newly generated sessionCartId in the response cookies
        response.cookies.set("sessionCartId", sessionCartId);
        return response;
      } else {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
