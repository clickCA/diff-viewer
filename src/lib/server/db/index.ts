import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { dev } from '$app/environment';

const DATABASE_URL =
	process.env.DATABASE_URL ||
	'postgresql://diffviewer:diffviewer_dev_password@localhost:5432/diffviewer';

// Create postgres connection
// For production, use a connection pool with max connections
const queryClient = postgres(DATABASE_URL, {
	max: dev ? 1 : 10,
	idle_timeout: 20,
	connect_timeout: 10
});

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in queries
export { schema };
