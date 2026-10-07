import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The repository root also has a package.json (for Husky + lint-staged), which
  // makes Next.js guess the wrong workspace root. Pin it to this folder.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Product photography is hotlinked from Unsplash's CDN, which their API
    // guidelines require (storing copies is not permitted).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
