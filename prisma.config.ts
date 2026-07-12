/**
 * @file prisma.config.ts
 * @description Prisma v7 configuration file.
 * Provides the schema location and the database connection URL used by
 * Prisma Migrate and introspection commands. The runtime PrismaClient uses
 * the pg driver adapter configured in src/config/prisma.ts.
 * Reference: https://pris.ly/d/config-datasource
 */

import path from 'path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
