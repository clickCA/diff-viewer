# Diff Viewer - Text Comparison Tool

A high-performance diff viewer application with shareable links and persistent storage. Compare text with character-level precision using VS Code-inspired algorithms. Built with SvelteKit 2, Svelte 5, Fastify, and PostgreSQL.

## Architecture

```
┌─────────────────┐
│  SvelteKit UI   │  ← Performance-optimized diff viewer
└────────┬────────┘
         │ HTTP
    ┌────▼─────┐
    │ Fastify  │  ← REST API for diff storage
    │   API    │
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Drizzle  │  ← Type-safe ORM
    │   ORM    │
    └────┬─────┘
         │
    ┌────▼─────┐
    │PostgreSQL│  ← Persistent diff storage
    └──────────┘
```

## Features

### Frontend
- **Character-Level Diff**: See exact character-by-character changes with color highlighting
- **Adaptive Algorithms**: Automatic selection between Myers and Dynamic Programming based on input size
- **Smart Navigation**: Previous/Next buttons to jump between changes
- **Keyboard Shortcuts**: `n`/`↓` for next, `p`/`↑` for previous diff
- **Performance Metrics**: Real-time algorithm selection and computation time display
- **Timeout Protection**: 5-second max computation time prevents UI freezing

### Backend
- **Persistent Storage**: PostgreSQL database with Drizzle ORM
- **Shareable Links**: Short URLs (e.g., `/diff/3f9c2e91ab`) for easy sharing
- **Private Diffs**: Optional token-based access control
- **TTL Support**: Configurable expiration (default 7 days)
- **View Analytics**: Track view counts and statistics
- **Auto Cleanup**: Scheduled cleanup of expired diffs

### General
- **File Upload Support**: Upload text files directly or paste content
- **Multiple File Formats**: Supports .txt, .md, .js, .ts, .jsx, .tsx, .json, .css, .html, .py, .java, .c, .cpp, .h, .go, .rs, .rb, .php, .swift, .kt, .sh
- **Share Links**: Generate shareable URLs with your text comparison embedded
- **Performance Optimized**:
  - Manual comparison trigger to prevent lag with large texts
  - Loading indicators during computation
  - Size warnings for large files (>100KB)
  - Diff truncation for very large comparisons (>5000 chunks)
  - Max-height containers with scroll for better performance
- **Character Counter**: Real-time character count for both text panels
- **Dark Mode Support**: Automatic dark mode styling
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: SvelteKit 2 + Svelte 5
- **UI Components**: shadcn-svelte + Tailwind CSS v4
- **Diff Engine**: diff-match-patch library
- **Icons**: Lucide Svelte

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Development

Start the development server:

```bash
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

### 3. Build for Production

```bash
pnpm build
```

### 4. Preview Production Build

```bash
pnpm preview
```

## How to Use

1. **Enter Text**: Paste or type text in the "Original" and "Modified" panels, or upload files
2. **Compare**: Click the "Compare" button to see the differences
3. **View Results**: Character-level differences are displayed side-by-side with color coding:
   - 🔴 Red: Deleted text (appears in Original)
   - 🟢 Green: Inserted text (appears in Modified)
   - ⚪ Gray: Unchanged text
4. **Share**: Click "Share Link" to copy a URL with your comparison that you can send to others
5. **Clear**: Use "Clear All" to reset and start a new comparison

## Performance Tips

- For very large files (>100KB), you'll see a warning. Consider comparing smaller sections for better performance.
- The diff computation happens only when you click "Compare", preventing lag while typing.
- Diffs with more than 5,000 chunks are automatically truncated to maintain browser responsiveness.
- Use the character counter to monitor text size before comparing.

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn-svelte components (Button, Card)
│   │   └── DiffViewer.svelte # Main diff viewer component
│   └── utils.ts             # Utility functions
├── routes/
│   ├── +layout.svelte       # Root layout with header
│   ├── +page.svelte         # Home page
│   └── Header.svelte        # Navigation header
└── app.css                  # Global styles and Tailwind config
```

## Key Features Explained

### Share Links

Share links encode both text panels in the URL parameters. When someone opens your shared link, both texts are automatically loaded and compared. This is perfect for:
- Code reviews
- Document comparisons
- Collaborative editing
- Bug reports showing before/after

### Character-Level Diff

Unlike line-based diffs, character-level comparison shows exact character changes, making it easier to spot:
- Typos and small edits
- Whitespace changes
- Formatting differences
- Single character modifications

### Performance Optimizations

The app is optimized for large texts with:
- **Lazy computation**: Diff only runs when you click "Compare"
- **Async processing**: UI remains responsive during computation
- **Render limits**: Prevents DOM bloat with thousands of elements
- **Scrollable containers**: Max-height with overflow for better layout
- **Size warnings**: Alerts you when processing very large files

## Browser Support

- Modern browsers with ES2020+ support
- Clipboard API for share link copying
- FileReader API for file uploads

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Run type checking |
| `pnpm lint` | Run linter |

## License

MIT
# diff-viewer
