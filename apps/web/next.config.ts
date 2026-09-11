import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve JS chunks / HMR to a browser loading the app
  // from the tunnel hostname instead of localhost.
  allowedDevOrigins: ["enquiry-martial-oem-group.trycloudflare.com", "172.28.18.53"],
  // Proxies /api/* to the NestJS server so the browser only ever talks to
  // this app's own origin. Needed for tunneled access and for production
  // (e.g. Render): the auth refresh cookie is sameSite=strict, so browser
  // calls to a separate API origin would silently drop it.
  //
  // API_INTERNAL_URL may be a full URL ("http://host:4000", for local/dev
  // overrides) or a bare "host:port" (what Render's fromService/hostport
  // blueprint reference produces for private-network service-to-service
  // calls) -- accept either.
  async rewrites() {
    const target = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    const apiOrigin = target.includes("://") ? target : `http://${target}`;
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
      // /uploads/* URLs are stored root-relative (see avatarUrlSchema) so
      // they resolve against whatever origin is currently serving the app --
      // this proxy is what makes that resolution actually correct.
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
      {
        source: "/health",
        destination: `${apiOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;
