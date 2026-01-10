/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    rules: {
      "*.mdx": {
        loaders: ["@mdx-js/loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;