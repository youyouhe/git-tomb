
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Critical for Tauri (SSG)
  images: {
    unoptimized: true, // Required for static export
  },
  // Ensure we can handle trailing slashes if needed for file routing
  trailingSlash: true,
};

export default nextConfig;
