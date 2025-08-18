import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client', 
    'bcryptjs', 
    '@libsql/client',
    '@prisma/adapter-libsql'
  ],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  }
};

export default nextConfig;
