import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://diffviewer:diffviewer_dev_password@localhost:5432/diffviewer',
  },
  verbose: true,
  strict: true,
});
