/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@kippu/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
