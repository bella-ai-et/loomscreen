/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'images.unsplash.com',
      '*.bunnycdn.com',
      '*.b-cdn.net',
    ],
  },
  experimental: {
    serverActions: true,
  },
  // Add any other necessary configurations here
};

module.exports = nextConfig;
