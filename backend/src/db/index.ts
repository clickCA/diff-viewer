import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://diffviewer:diffviewer_dev_password@localhost:5432/diffviewer';

// Create postgres connection
const queryClient = postgres(DATABASE_URL);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in queries
export { schema };
