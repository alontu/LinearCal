import type { NextConfig } from "next";

// Suppress deprecated zlib.bytesRead warning
if (typeof process !== 'undefined') {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = (warning, ...args) => {
    if (
      typeof warning === 'string' &&
      warning.includes('zlib.bytesRead')
    ) {
      return;
    }
    if (
      typeof warning === 'object' &&
      warning &&
      'message' in warning &&
      typeof warning.message === 'string' &&
      warning.message.includes('zlib.bytesRead')
    ) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEmitWarning as any)(warning, ...args);
  };
}

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://app.posthog.com https://oauth2.googleapis.com https://www.googleapis.com; font-src 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
