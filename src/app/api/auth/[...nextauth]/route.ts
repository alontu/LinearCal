import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const handler = async (req: NextRequest, ctx: { params: any }) => {
    // Dynamically set NEXTAUTH_URL if it's missing or set to localhost in production/staging
    // This helps in environments where the hostname is not known at build time or not set in env.
    console.log("DEBUG AUTH ROUTE:", {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        host: req.headers.get("host"),
        proto: req.headers.get("x-forwarded-proto")
    });

    if (process.env.NODE_ENV !== "development" && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))) {
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host");
        if (host) {
            process.env.NEXTAUTH_URL = `${protocol}://${host}`;
        }
    }

    return await NextAuth(req, ctx, authOptions);
};

export { handler as GET, handler as POST };
