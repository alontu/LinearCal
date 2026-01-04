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
    return (originalEmitWarning as any)(warning, ...args);
  };
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
