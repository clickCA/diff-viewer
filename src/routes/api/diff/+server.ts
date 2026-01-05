import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { nanoid } from 'nanoid';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { textA, textB, ttlDays = 7, isPrivate = false } = body;

		// Validation
		if (!textA || !textB) {
			return json({ error: 'textA and textB are required' }, { status: 400 });
		}

		if (typeof textA !== 'string' || typeof textB !== 'string') {
			return json({ error: 'textA and textB must be strings' }, { status: 400 });
		}

		if (textA.length > MAX_SIZE || textB.length > MAX_SIZE) {
			return json({ error: 'Text size exceeds 5MB limit' }, { status: 400 });
		}

		// Generate short ID
		const shortId = nanoid(10);

		// Calculate expiration
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + ttlDays);

		// Generate access token for private diffs
		const accessToken = isPrivate ? nanoid(32) : null;

		const [document] = await db
			.insert(schema.diffDocuments)
			.values({
				shortId,
				textA,
				textB,
				textASize: textA.length,
				textBSize: textB.length,
				ttlDays,
				expiresAt,
				isPrivate,
				accessToken
			})
			.returning();

		const url = `/diff/${shortId}`;
		const fullUrl = isPrivate ? `${url}?token=${accessToken}` : url;

		return json({
			id: document.id,
			shortId: document.shortId,
			url: fullUrl,
			expiresAt: document.expiresAt,
			isPrivate: document.isPrivate
		});
	} catch (error) {
		console.error('Failed to create diff:', error);
		return json({ error: 'Failed to create diff' }, { status: 500 });
	}
};
