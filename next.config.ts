import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async redirects() {
    return [
      { source: '/admin/:path+', destination: '/:path+', permanent: false },
      {
        source: '/admin',
        destination: '/',
        permanent: false,
      },
      {
        source: '/fb',
        destination: '/hocsocapcuu?source=facebook',
        permanent: false,
      },
      {
        source: '/zalo',
        destination: '/hocsocapcuu?source=zalo',
        permanent: false,
      },
      {
        source: '/page',
        destination: '/hocsocapcuu?source=fanpage',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
