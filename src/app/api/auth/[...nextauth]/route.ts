import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const handler = async (req: NextRequest, ctx: { params: any }) => {
    // Dynamically set NEXTAUTH_URL if it's missing or set to localhost in production/staging
    // This helps in environments where the hostname is not known at build time or not set in env.
    if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost")) {
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host");
        if (host) {
            process.env.NEXTAUTH_URL = `${protocol}://${host}`;
        }
    }

    return await NextAuth(req, ctx, authOptions);
};

export { handler as GET, handler as POST };
