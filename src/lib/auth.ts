import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Helper function to refresh the access token
async function refreshAccessToken(token: any) {
    try {
        const url =
            "https://oauth2.googleapis.com/token?" +
            new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            });

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            // Fall back to old refresh token if new one is not returned
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("RefreshAccessTokenError", error);

        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/calendar",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                return {
                    accessToken: account.access_token,
                    accessTokenExpires: (account.expires_at ?? 0) * 1000,
                    refreshToken: account.refresh_token,
                    user: token.user,
                };
            }

            // Return previous token if the access token has not expired yet
            // Give a 10 second buffer
            if (Date.now() < ((token as any).accessTokenExpires - 10000)) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            // Optionally pass error to client to force sign out
            session.error = token.error as string | undefined;
            return session;
        },
    },
};
