/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // searoute-js ships a large maritime-network geojson; load it from node_modules
  // at runtime instead of bundling it into the route.
  serverExternalPackages: ["searoute-js"],
};

export default nextConfig;
