/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.CREW_NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./certs/supabase-ca-2021.crt"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
