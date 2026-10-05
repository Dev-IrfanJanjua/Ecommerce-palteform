import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The repository root also has a package.json (for Husky + lint-staged), which
  // makes Next.js guess the wrong workspace root. Pin it to this folder.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
