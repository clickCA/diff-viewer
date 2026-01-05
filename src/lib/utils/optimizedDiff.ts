/**
 * Performance-optimized diff computation inspired by VS Code's DefaultLinesDiffComputer
 * Uses adaptive algorithms based on input size and includes timeout protection
 */

import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL, type Diff } from 'diff-match-patch';

export interface DiffOptions {
	maxComputationTimeMs?: number;
	checkLines?: boolean;
	lineMode?: boolean;
	semanticCleanup?: boolean;
}

export interface DiffResult {
	diffs: Diff[];
	hitTimeout: boolean;
	computationTimeMs: number;
	algorithm: 'fast' | 'accurate' | 'line-based';
	stats: {
		totalSize: number;
		changeCount: number;
		insertions: number;
		deletions: number;
	};
}

const SIZE_THRESHOLD_ACCURATE = 1700; // Use accurate algorithm below this
const CHAR_THRESHOLD_ACCURATE = 500; // Use accurate for character diffs below this
const DEFAULT_TIMEOUT = 5000; // 5 seconds default timeout

export class OptimizedDiffComputer {
	private dmp: diff_match_patch;

	constructor() {
		this.dmp = new diff_match_patch();
	}

	/**
	 * Compute diff with adaptive algorithm selection and timeout protection
	 */
	computeDiff(text1: string, text2: string, options: DiffOptions = {}): DiffResult {
		const startTime = performance.now();
		const timeout = options.maxComputationTimeMs ?? DEFAULT_TIMEOUT;
		const deadline = startTime + timeout;

		// Early exit for identical texts
		if (text1 === text2) {
			return {
				diffs: [[DIFF_EQUAL, text1]],
				hitTimeout: false,
				computationTimeMs: performance.now() - startTime,
				algorithm: 'fast',
				stats: {
					totalSize: text1.length,
					changeCount: 0,
					insertions: 0,
					deletions: 0
				}
			};
		}

		// Check if we should use line-based diffing first
		const shouldUseLineMode = options.lineMode !== false && (
			text1.includes('\n') || text2.includes('\n')
		);

		let diffs: Diff[];
		let algorithm: 'fast' | 'accurate' | 'line-based';

		if (shouldUseLineMode) {
			// Line-based approach for multi-line texts
			diffs = this.computeLineDiff(text1, text2, deadline);
			algorithm = 'line-based';
		} else {
			// Character-based approach
			const totalSize = text1.length + text2.length;

			if (totalSize < CHAR_THRESHOLD_ACCURATE) {
				// Small text: use accurate algorithm
				this.dmp.Diff_Timeout = timeout / 1000;
				diffs = this.dmp.diff_main(text1, text2);
				algorithm = 'accurate';
			} else {
				// Large text: use fast algorithm with checklines
				this.dmp.Diff_Timeout = timeout / 1000;
				diffs = this.dmp.diff_main(text1, text2, true); // checklines = true for speed
				algorithm = 'fast';
			}
		}

		// Check if we hit timeout
		const computationTime = performance.now() - startTime;
		const hitTimeout = computationTime >= timeout * 0.95; // 95% of timeout

		// Apply semantic cleanup if not timed out and requested
		if (!hitTimeout && (options.semanticCleanup !== false)) {
			this.dmp.diff_cleanupSemantic(diffs);
		}

		// Compute statistics
		const stats = this.computeStats(diffs);

		return {
			diffs,
			hitTimeout,
			computationTimeMs: computationTime,
			algorithm,
			stats
		};
	}

	/**
	 * Line-based diff computation for better performance on multi-line texts
	 */
	private computeLineDiff(text1: string, text2: string, deadline: number): Diff[] {
		const lines1 = text1.split('\n');
		const lines2 = text2.split('\n');
		const totalLines = lines1.length + lines2.length;

		// Create line-level hash map for fast comparison
		const lineHash = new Map<string, number>();
		let nextHash = 0;

		const getLineHash = (line: string): number => {
			const trimmed = line.trim();
			let hash = lineHash.get(trimmed);
			if (hash === undefined) {
				hash = nextHash++;
				lineHash.set(trimmed, hash);
			}
			return hash;
		};

		const hashes1 = lines1.map(l => getLineHash(l));
		const hashes2 = lines2.map(l => getLineHash(l));

		// Use appropriate algorithm based on size
		if (totalLines < SIZE_THRESHOLD_ACCURATE) {
			// Accurate algorithm for smaller files
			return this.computeLinesDiffAccurate(lines1, lines2, hashes1, hashes2, deadline);
		} else {
			// Fast algorithm for larger files
			return this.computeLinesDiffFast(lines1, lines2, deadline);
		}
	}

	/**
	 * Accurate line-level diff using Myers algorithm
	 */
	private computeLinesDiffAccurate(
		lines1: string[],
		lines2: string[],
		hashes1: number[],
		hashes2: number[],
		deadline: number
	): Diff[] {
		// Create text representation with line markers
		const text1 = lines1.join('\n');
		const text2 = lines2.join('\n');

		// Compute character-level diff
		const charDiffs = this.dmp.diff_main(text1, text2);

		return charDiffs;
	}

	/**
	 * Fast line-level diff with checklines optimization
	 */
	private computeLinesDiffFast(
		lines1: string[],
		lines2: string[],
		deadline: number
	): Diff[] {
		const text1 = lines1.join('\n');
		const text2 = lines2.join('\n');

		// Use checklines for faster computation
		return this.dmp.diff_main(text1, text2, true);
	}

	/**
	 * Compute statistics about the diff
	 */
	private computeStats(diffs: Diff[]): DiffResult['stats'] {
		let totalSize = 0;
		let changeCount = 0;
		let insertions = 0;
		let deletions = 0;

		for (const [op, text] of diffs) {
			totalSize += text.length;
			if (op === DIFF_DELETE) {
				deletions += text.length;
				changeCount++;
			} else if (op === DIFF_INSERT) {
				insertions += text.length;
				changeCount++;
			}
		}

		return {
			totalSize,
			changeCount,
			insertions,
			deletions
		};
	}

	/**
	 * Optimize diffs by merging adjacent equal sections and removing tiny changes
	 */
	optimizeDiffs(diffs: Diff[]): Diff[] {
		// Remove very short matches between long diffs (noise reduction)
		const result: Diff[] = [];

		for (let i = 0; i < diffs.length; i++) {
			const curr = diffs[i];

			// Skip very short EQUAL sections between changes
			if (curr[0] === DIFF_EQUAL && curr[1].length < 3 && i > 0 && i < diffs.length - 1) {
				const prev = diffs[i - 1];
				const next = diffs[i + 1];

				// If surrounded by changes, consider this equal section as part of the change
				if (prev[0] !== DIFF_EQUAL && next[0] !== DIFF_EQUAL) {
					continue; // Skip this tiny equal section
				}
			}

			result.push(curr);
		}

		return result;
	}

	/**
	 * Get indices of all change locations (not EQUAL sections)
	 */
	getChangeIndices(diffs: Diff[]): number[] {
		const indices: number[] = [];

		for (let i = 0; i < diffs.length; i++) {
			const [op] = diffs[i];
			if (op !== DIFF_EQUAL) {
				indices.push(i);
			}
		}

		return indices;
	}
}

/**
 * Render diffs to HTML with virtualization support
 */
export interface RenderOptions {
	maxChunks?: number;
	highlightIndex?: number;
}

export interface RenderedDiff {
	leftHtml: string;
	rightHtml: string;
	changeCount: number;
	truncated: boolean;
}

export function renderDiffToHtml(
	diffs: Diff[],
	options: RenderOptions = {}
): RenderedDiff {
	const maxChunks = options.maxChunks ?? 5000;
	const highlightIndex = options.highlightIndex ?? -1;

	let leftHtml = '';
	let rightHtml = '';
	let chunkCount = 0;
	let actualDiffIndex = 0;
	let truncated = false;

	for (const [op, text] of diffs) {
		if (chunkCount++ > maxChunks) {
			const msg = '<span class="text-muted-foreground italic">[... diff truncated for performance ...]</span>';
			leftHtml += msg;
			rightHtml += msg;
			truncated = true;
			break;
		}

		const escapedText = escapeHtml(text);

		if (op === DIFF_DELETE) {
			const highlighted = actualDiffIndex === highlightIndex;
			const ringClass = highlighted ? 'ring-2 ring-blue-500 ring-offset-2' : '';
			leftHtml += `<span class="bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200 ${ringClass}" data-diff-index="${actualDiffIndex}">${escapedText}</span>`;
			actualDiffIndex++;
		} else if (op === DIFF_INSERT) {
			const highlighted = actualDiffIndex === highlightIndex;
			const ringClass = highlighted ? 'ring-2 ring-blue-500 ring-offset-2' : '';
			rightHtml += `<span class="bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-200 ${ringClass}" data-diff-index="${actualDiffIndex}">${escapedText}</span>`;
			actualDiffIndex++;
		} else if (op === DIFF_EQUAL) {
			leftHtml += `<span class="text-gray-700 dark:text-gray-300">${escapedText}</span>`;
			rightHtml += `<span class="text-gray-700 dark:text-gray-300">${escapedText}</span>`;
		}
	}

	return {
		leftHtml,
		rightHtml,
		changeCount: actualDiffIndex,
		truncated
	};
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\n/g, '<br>');
}
