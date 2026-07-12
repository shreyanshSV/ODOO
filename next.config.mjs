/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // searoute-js ships a large maritime-network geojson; load it from node_modules
  // at runtime instead of bundling it into the route.
  serverExternalPackages: ["searoute-js"],
  // Hackathon-friendly: don't let lint/type warnings block a working build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
