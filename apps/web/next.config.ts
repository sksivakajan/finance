import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxies /api/* to the local NestJS server so the browser only ever talks
  // to this app's own origin. Needed for tunneled access (e.g. mobile
  // testing over a public URL): the auth refresh cookie is sameSite=strict,
  // so browser calls to a separate API origin would silently drop it.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
