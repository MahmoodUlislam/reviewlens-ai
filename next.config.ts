import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable compression so streaming responses aren't buffered
  compress: false,
};

export default nextConfig;
