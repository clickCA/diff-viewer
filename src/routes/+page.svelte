<script lang="ts">
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import { FileCode2, Zap, Share2 } from 'lucide-svelte';
	import { Card } from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>Diff Viewer - Compare Text & Files</title>
	<meta name="description" content="A simple diff viewer for developers to compare text with character-level differences, file upload support, and shareable links" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-4xl md:text-5xl font-bold mb-3">
			<span class="text-primary">Diff Viewer</span>
		</h1>
		<p class="text-lg text-muted-foreground max-w-2xl mx-auto">
			Compare text and files with character-level precision. Upload files, share links, and visualize differences instantly.
		</p>
	</div>



	<!-- Diff Viewer -->
	<DiffViewer />
</div>
