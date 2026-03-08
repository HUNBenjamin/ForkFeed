import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@prisma/client/**", "./node_modules/.prisma/**"],
  },
};

export default nextConfig;
