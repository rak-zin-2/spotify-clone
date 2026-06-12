import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',  // Add this for static export
  images: {
    unoptimized: true, // Required for static export if you use next/image
  },
  // Optional: if you need trailing slashes
  trailingSlash: false,
};

export default nextConfig;