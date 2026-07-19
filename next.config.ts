import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_CLIENT_STORAGE: process.env.CI ? "true" : "",
  },
};

export default withAui(nextConfig);
