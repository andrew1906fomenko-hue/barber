/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.83.148.24", "10.183.147.24", "172.19.0.1"],
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  reactStrictMode: true,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
