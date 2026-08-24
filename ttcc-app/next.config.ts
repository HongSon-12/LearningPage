import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/fb',
        destination: '/?source=facebook',
        permanent: false,
      },
      {
        source: '/zalo',
        destination: '/?source=zalo',
        permanent: false,
      },
      {
        source: '/page',
        destination: '/?source=fanpage',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
