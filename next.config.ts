import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": [
      "./.local/**/*",
      "./.env*",
      "./.git/**/*",
      "./.next/dev/**/*",
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
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://img.vietqr.io; font-src 'self'; connect-src 'self'${process.env.NODE_ENV === 'development' ? ' ws: wss:' : ''}; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
      ...["/api/files/:fileId", "/api/attendance/:sessionId/identity/:registrationId"].map(source=>({
        source,
        headers:[{key:"Content-Security-Policy",value:"sandbox; default-src 'none'; frame-ancestors 'none'"}],
      })),
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
