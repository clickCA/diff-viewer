<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { OptimizedDiffComputer, renderDiffToHtml } from '$lib/utils/optimizedDiff';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data } = $props();

	const diffComputer = new OptimizedDiffComputer();
	let currentDiffIndex = $state(0);
	let diffChunkCount = $state(0);
	let showPerfMetrics = $state(false);

	// Compute diff on mount
	const diffResult = $derived.by(() => {
		if (!data.diff) return null;

		return diffComputer.computeDiff(data.diff.textA, data.diff.textB, {
			maxComputationTimeMs: 5000,
			semanticCleanup: true,
			lineMode: true
		});
	});

	// Render diff
	const renderedDiff = $derived.by(() => {
		if (!diffResult) {
			return { leftHtml: '', rightHtml: '', changeCount: 0, truncated: false };
		}

		const rendered = renderDiffToHtml(diffResult.diffs, {
			maxChunks: 5000,
			highlightIndex: currentDiffIndex
		});

		diffChunkCount = rendered.changeCount;
		showPerfMetrics = diffResult.computationTimeMs > 100;
		return rendered;
	});

	function goToNextDiff() {
		if (currentDiffIndex < diffChunkCount - 1) {
			currentDiffIndex++;
			scrollToDiff(currentDiffIndex);
		}
	}

	function goToPreviousDiff() {
		if (currentDiffIndex > 0) {
			currentDiffIndex--;
			scrollToDiff(currentDiffIndex);
		}
	}

	function scrollToDiff(index: number) {
		if (browser) {
			setTimeout(() => {
				const element = document.querySelector(`[data-diff-index="${index}"]`);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
		}
	}

	onMount(() => {
		if (browser) {
			// Add keyboard shortcuts
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

				if (e.key === 'n' || e.key === 'ArrowDown') {
					e.preventDefault();
					goToNextDiff();
				} else if (e.key === 'p' || e.key === 'ArrowUp') {
					e.preventDefault();
					goToPreviousDiff();
				}
			};

			window.addEventListener('keydown', handleKeyDown);

			return () => {
				window.removeEventListener('keydown', handleKeyDown);
			};
		}
	});
</script>

<svelte:head>
	<title>Diff Viewer - {data.diff.shortId}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold mb-2">Shared Diff</h1>
				<div class="flex items-center gap-4 text-sm text-muted-foreground">
					<span>ID: {data.diff.shortId}</span>
					<span>Views: {data.diff.viewCount}</span>
					{#if data.diff.createdAt}
						<span>Created: {new Date(data.diff.createdAt).toLocaleDateString()}</span>
					{/if}
					{#if data.diff.expiresAt}
						<span>Expires: {new Date(data.diff.expiresAt).toLocaleDateString()}</span>
					{/if}
				</div>
			</div>
			<Button href="/">Create New Diff</Button>
		</div>
	</div>

	<!-- Performance Metrics -->
	{#if showPerfMetrics && diffResult}
		<Card class="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
			<div class="flex items-center justify-between flex-wrap gap-3">
				<div class="flex items-center gap-6 text-sm">
					<div>
						<span class="font-semibold">Algorithm:</span>
						<span class="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded text-blue-900 dark:text-blue-200">
							{diffResult.algorithm}
						</span>
					</div>
					<div>
						<span class="font-semibold">Time:</span>
						<span class="ml-2">{diffResult.computationTimeMs.toFixed(2)}ms</span>
					</div>
					<div>
						<span class="font-semibold">Changes:</span>
						<span class="ml-2">{diffResult.stats.changeCount}</span>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Diff Navigation -->
	{#if diffChunkCount > 0}
		<Card class="p-4 mb-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button
						onclick={goToPreviousDiff}
						variant="outline"
						size="sm"
						disabled={currentDiffIndex === 0}
					>
						<ChevronLeft class="h-4 w-4 mr-1" />
						Previous
					</Button>
					<span class="text-sm font-medium">
						Diff {currentDiffIndex + 1} of {diffChunkCount}
					</span>
					<Button
						onclick={goToNextDiff}
						variant="outline"
						size="sm"
						disabled={currentDiffIndex === diffChunkCount - 1}
					>
						Next
						<ChevronRight class="h-4 w-4 ml-1" />
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Use n/↓ for next, p/↑ for previous
				</p>
			</div>
		</Card>
	{/if}

	<!-- Diff Output -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-xl">Diff View</h3>
			{#if renderedDiff.truncated}
				<span class="text-xs text-yellow-700 dark:text-yellow-300">
					⚠️ Display truncated for performance
				</span>
			{/if}
		</div>
		<div class="grid md:grid-cols-2 gap-4">
			<!-- Left Diff -->
			<Card class="p-4">
				<div class="space-y-2">
					<h4 class="font-medium text-sm text-muted-foreground">Original (with deletions)</h4>
					<div class="p-3 bg-muted rounded-md min-h-[200px] max-h-[600px] font-mono text-sm overflow-auto whitespace-pre-wrap break-words">
						{@html renderedDiff.leftHtml}
					</div>
				</div>
			</Card>

			<!-- Right Diff -->
			<Card class="p-4">
				<div class="space-y-2">
					<h4 class="font-medium text-sm text-muted-foreground">Modified (with insertions)</h4>
					<div class="p-3 bg-muted rounded-md min-h-[200px] max-h-[600px] font-mono text-sm overflow-auto whitespace-pre-wrap break-words">
						{@html renderedDiff.rightHtml}
					</div>
				</div>
			</Card>
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap gap-4 text-sm">
			<div class="flex items-center gap-2">
				<span class="px-2 py-1 bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200 rounded">
					Deleted
				</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="px-2 py-1 bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-200 rounded">
					Inserted
				</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
					Unchanged
				</span>
			</div>
		</div>
	</div>
</div>
