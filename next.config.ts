import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": [
      "./.local/**/*",
      "./.env*",
      "./.git/**/*",
      "./.next/**/*",
      "./public/uploads/**/*",
    ],
  },
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.vietqr.io; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
      {
        source: "/courses/:classId/sessions/:sessionId",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/admin/:path+", destination: "/:path+", permanent: false },
      {
        source: "/admin",
        destination: "/",
        permanent: false,
      },
      {
        source: "/fb",
        destination: "/hocsocapcuu?source=facebook",
        permanent: false,
      },
      {
        source: "/zalo",
        destination: "/hocsocapcuu?source=zalo",
        permanent: false,
      },
      {
        source: "/page",
        destination: "/hocsocapcuu?source=fanpage",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
