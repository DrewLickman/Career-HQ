import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/material": ["./.job-search/**/*"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
