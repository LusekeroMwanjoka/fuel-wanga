import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @supabase/realtime-js imports @supabase/phoenix internally, but that
    // package is not published as a standalone dep and is not needed here
    // because this app does not use Supabase Realtime / Presence.
    // require.resolve gives an absolute POSIX-safe path that works on both
    // Windows (dev) and Linux (Vercel).
    config.resolve.alias["@supabase/phoenix"] = require.resolve(
      "./lib/phoenix-stub.js",
    );
    return config;
  },
};

export default nextConfig;
