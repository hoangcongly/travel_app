/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Leaflet has issues with strict mode double-mount
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Allow leaflet CSS import
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
