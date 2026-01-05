import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		const [stats] = await db
			.select({
				totalDiffs: sql<number>`count(*)::int`,
				totalViews: sql<number>`coalesce(sum(${schema.diffDocuments.viewCount}), 0)::int`,
				avgSize: sql<number>`coalesce(avg((${schema.diffDocuments.textASize} + ${schema.diffDocuments.textBSize})), 0)::int`
			})
			.from(schema.diffDocuments);

		return json(stats || { totalDiffs: 0, totalViews: 0, avgSize: 0 });
	} catch (error) {
		console.error('Failed to get stats:', error);
		return json({ totalDiffs: 0, totalViews: 0, avgSize: 0 });
	}
};
