import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { lt } from 'drizzle-orm';

export const POST: RequestHandler = async () => {
	try {
		const result = await db
			.delete(schema.diffDocuments)
			.where(lt(schema.diffDocuments.expiresAt, new Date()))
			.returning();

		return json({
			deleted: result.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Cleanup failed:', error);
		return json({ error: 'Cleanup failed' }, { status: 500 });
	}
};
