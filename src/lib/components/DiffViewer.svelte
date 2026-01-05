<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Upload, Share2, Copy, RotateCcw, ChevronUp, ChevronDown } from 'lucide-svelte';
	import { type Diff } from 'diff-match-patch';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { OptimizedDiffComputer, renderDiffToHtml, type DiffResult } from '$lib/utils/optimizedDiff';

	let leftText = $state('');
	let rightText = $state('');
	let diffResult: DiffResult | null = $state(null);
	let shareUrl = $state('');
	let copySuccess = $state(false);
	let isComputing = $state(false);
	let showSizeWarning = $state(false);
	let currentDiffIndex = $state(0);
	let showPerfMetrics = $state(false);

	const diffComputer = new OptimizedDiffComputer();
	const MAX_SIZE = 100000; // 100KB warning threshold
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (browser) {
			// Load from URL params on mount
			const params = new URLSearchParams(window.location.search);
			const left = params.get('left');
			const right = params.get('right');

			if (left) leftText = decodeURIComponent(left);
			if (right) rightText = decodeURIComponent(right);

			if (left || right) {
				computeDiff();
			}

			// Add keyboard shortcuts for navigation
			const handleKeyDown = (e: KeyboardEvent) => {
				// Only handle if not typing in a textarea
				if (e.target instanceof HTMLTextAreaElement) return;

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

	async function computeDiff() {
		const totalSize = leftText.length + rightText.length;
		showSizeWarning = totalSize > MAX_SIZE;

		isComputing = true;
		currentDiffIndex = 0; // Reset to first diff
		// Use setTimeout to allow UI to update
		await new Promise(resolve => setTimeout(resolve, 0));

		try {
			// Use optimized diff computer with adaptive algorithms
			diffResult = diffComputer.computeDiff(leftText, rightText, {
				maxComputationTimeMs: 5000, // 5 second timeout
				semanticCleanup: true,
				lineMode: true
			});

			// Show performance metrics if computation took significant time
			showPerfMetrics = diffResult.computationTimeMs > 100 || totalSize > 10000;
		} finally {
			isComputing = false;
		}
	}

	function debouncedComputeDiff() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			computeDiff();
		}, 500);
	}

	let leftFileInput: HTMLInputElement;
	let rightFileInput: HTMLInputElement;

	function handleLeftFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				leftText = e.target?.result as string;
				computeDiff();
			};
			reader.readAsText(file);
		}
	}

	function handleRightFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				rightText = e.target?.result as string;
				computeDiff();
			};
			reader.readAsText(file);
		}
	}

	function triggerLeftUpload() {
		leftFileInput?.click();
	}

	function triggerRightUpload() {
		rightFileInput?.click();
	}

	function generateShareLink() {
		if (browser) {
			const params = new URLSearchParams();
			if (leftText) params.set('left', leftText);
			if (rightText) params.set('right', rightText);

			shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
		}
	}

	async function copyShareLink() {
		generateShareLink();
		if (shareUrl && browser) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				copySuccess = true;
				setTimeout(() => {
					copySuccess = false;
				}, 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
				alert('Failed to copy link. Please copy manually: ' + shareUrl);
			}
		}
	}

	function clearAll() {
		leftText = '';
		rightText = '';
		diffResult = null;
		shareUrl = '';
		currentDiffIndex = 0;
		showPerfMetrics = false;
		if (browser) {
			goto(window.location.pathname, { replaceState: true });
		}
	}

	// Derived values for rendering
	const renderedDiff = $derived.by(() => {
		if (!diffResult) {
			return { leftHtml: '', rightHtml: '', changeCount: 0, truncated: false };
		}

		const rendered = renderDiffToHtml(diffResult.diffs, {
			maxChunks: 5000,
			highlightIndex: currentDiffIndex
		});

		return rendered;
	});

	// Derive diffChunkCount separately to avoid state mutation in $derived
	const diffChunkCount = $derived(renderedDiff.changeCount);

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
			// Use setTimeout to ensure DOM is updated
			setTimeout(() => {
				const element = document.querySelector(`[data-diff-index="${index}"]`);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
		}
	}
</script>

<div class="space-y-6">
	<!-- Size Warning -->
	{#if showSizeWarning}
		<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				<strong>Large text detected:</strong> Using optimized algorithms for better performance.
			</p>
		</div>
	{/if}

	<!-- Performance Metrics -->
	{#if showPerfMetrics && diffResult}
		<Card class="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
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
					<div>
						<span class="font-semibold">Size:</span>
						<span class="ml-2">{(diffResult.stats.totalSize / 1024).toFixed(2)}KB</span>
					</div>
				</div>
				{#if diffResult.hitTimeout}
					<span class="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
						⚠️ Computation timeout - showing partial results
					</span>
				{/if}
			</div>
		</Card>
	{/if}

	<!-- Controls -->
	<div class="flex flex-wrap gap-3 items-center justify-between">
		<div class="flex gap-2">
			<Button onclick={computeDiff} variant="default" disabled={isComputing}>
				{#if isComputing}
					Computing...
				{:else}
					Compare
				{/if}
			</Button>
			<Button onclick={clearAll} variant="outline" disabled={isComputing}>
				<RotateCcw class="h-4 w-4 mr-2" />
				Clear All
			</Button>
		</div>
		<div class="flex gap-2">
			<Button onclick={copyShareLink} variant="outline" disabled={isComputing}>
				{#if copySuccess}
					<Copy class="h-4 w-4 mr-2" />
					Copied!
				{:else}
					<Share2 class="h-4 w-4 mr-2" />
					Share Link
				{/if}
			</Button>
		</div>
	</div>

	<!-- Input Section -->
	<div class="grid md:grid-cols-2 gap-4">
		<!-- Left Panel -->
		<Card class="p-4">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-lg">Original</h3>
					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground">{leftText.length.toLocaleString()} chars</span>
						<input
							bind:this={leftFileInput}
							type="file"
							accept=".txt,.md,.js,.ts,.jsx,.tsx,.json,.css,.html,.py,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.swift,.kt,.sh"
							onchange={handleLeftFileUpload}
							class="hidden"
						/>
						<Button variant="outline" size="sm" onclick={triggerLeftUpload}>
							<Upload class="h-4 w-4 mr-2" />
							Upload
						</Button>
					</div>
				</div>
				<textarea
					bind:value={leftText}
					placeholder="Paste or type original text here..."
					class="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
				></textarea>
			</div>
		</Card>

		<!-- Right Panel -->
		<Card class="p-4">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-lg">Modified</h3>
					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground">{rightText.length.toLocaleString()} chars</span>
						<input
							bind:this={rightFileInput}
							type="file"
							accept=".txt,.md,.js,.ts,.jsx,.tsx,.json,.css,.html,.py,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.swift,.kt,.sh"
							onchange={handleRightFileUpload}
							class="hidden"
						/>
						<Button variant="outline" size="sm" onclick={triggerRightUpload}>
							<Upload class="h-4 w-4 mr-2" />
							Upload
						</Button>
					</div>
				</div>
				<textarea
					bind:value={rightText}
					placeholder="Paste or type modified text here..."
					class="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
				></textarea>
			</div>
		</Card>
	</div>

	<!-- Diff Output with Side Navigation -->
	{#if isComputing}
		<div class="flex items-center justify-center p-12">
			<div class="text-center space-y-4">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
				<p class="text-muted-foreground">Computing differences...</p>
			</div>
		</div>
	{:else if diffResult && diffResult.diffs.length > 0}
		<div class="relative">
			<!-- Floating Navigation Sidebar -->
			{#if diffChunkCount > 0}
				<div class="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
					<Card class="p-3 shadow-lg">
						<div class="flex flex-col items-center gap-3">
							<Button
								onclick={goToPreviousDiff}
								variant="outline"
								size="sm"
								disabled={currentDiffIndex === 0}
								class="h-10 w-10 p-0"
								title="Previous diff (↑ or P)"
							>
								<ChevronUp class="h-5 w-5" />
							</Button>
							<div class="flex flex-col items-center gap-1 py-2">
								<span class="text-xs font-semibold">{currentDiffIndex + 1}</span>
								<div class="h-px w-6 bg-border"></div>
								<span class="text-xs text-muted-foreground">{diffChunkCount}</span>
							</div>
							<Button
								onclick={goToNextDiff}
								variant="outline"
								size="sm"
								disabled={currentDiffIndex === diffChunkCount - 1}
								class="h-10 w-10 p-0"
								title="Next diff (↓ or N)"
							>
								<ChevronDown class="h-5 w-5" />
							</Button>
						</div>
					</Card>
				</div>

				<!-- Mobile Navigation Bar (Bottom) -->
				<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
					<Card class="p-2 shadow-lg">
						<div class="flex items-center gap-3 px-2">
							<Button
								onclick={goToPreviousDiff}
								variant="outline"
								size="sm"
								disabled={currentDiffIndex === 0}
								class="h-10 w-10 p-0"
								title="Previous diff"
							>
								<ChevronUp class="h-5 w-5" />
							</Button>
							<span class="text-sm font-medium whitespace-nowrap px-2">
								{currentDiffIndex + 1} / {diffChunkCount}
							</span>
							<Button
								onclick={goToNextDiff}
								variant="outline"
								size="sm"
								disabled={currentDiffIndex === diffChunkCount - 1}
								class="h-10 w-10 p-0"
								title="Next diff"
							>
								<ChevronDown class="h-5 w-5" />
							</Button>
						</div>
					</Card>
				</div>
			{/if}

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-xl">Character-Level Diff</h3>
					<div class="flex items-center gap-3">
						{#if diffChunkCount > 0}
							<span class="text-xs text-muted-foreground hidden sm:inline">
								Use ↑↓ or P/N keys to navigate
							</span>
						{/if}
						{#if renderedDiff.truncated}
							<span class="text-xs text-yellow-700 dark:text-yellow-300">
								⚠️ Display truncated
							</span>
						{/if}
					</div>
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
				<div class="flex flex-wrap gap-4 text-sm pb-20 lg:pb-0">
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
	{/if}
</div>
