import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/client/*.node"],
  },
};

export default nextConfig;
