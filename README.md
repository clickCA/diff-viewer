# Diff Viewer - Text Comparison Tool

A high-performance diff viewer application with shareable links and persistent storage. Compare text with character-level precision using VS Code-inspired algorithms. Built with SvelteKit 2, Svelte 5, Drizzle ORM, and PostgreSQL.

## Architecture

```
┌─────────────────────────────┐
│      SvelteKit App          │
│  ┌───────────────────────┐  │
│  │   Frontend (Svelte)   │  │  ← Diff viewer UI
│  └───────────┬───────────┘  │
│              │               │
│  ┌───────────▼───────────┐  │
│  │   API Routes          │  │  ← REST endpoints
│  │   /api/diff           │  │
│  │   /api/stats          │  │
│  └───────────┬───────────┘  │
│              │               │
│  ┌───────────▼───────────┐  │
│  │   Drizzle ORM         │  │  ← Type-safe queries
│  └───────────┬───────────┘  │
└──────────────┼───────────────┘
               │
    ┌──────────▼──────────┐
    │    PostgreSQL       │     ← Persistent storage
    └─────────────────────┘
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

- **Framework**: SvelteKit 2 + Svelte 5 (full-stack)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM (type-safe queries)
- **UI Components**: shadcn-svelte + Tailwind CSS v4
- **Diff Engine**: Custom optimized diff-match-patch wrapper
- **Icons**: Lucide Svelte
- **Deployment**: Docker + Docker Compose

## Getting Started

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432`

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Database

Push the database schema using Drizzle:

```bash
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit **http://localhost:5173**

### 5. Build for Production

```bash
pnpm build
```

### 6. Preview Production Build

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
4. **Navigate**: Use Previous/Next buttons or keyboard shortcuts (`↑`/`↓` or `p`/`n`) to jump between changes
5. **Share**: Click "Share Link" to save your diff and get a shareable URL (e.g., `/diff/abc123def`)
6. **Clear**: Use "Clear All" to reset and start a new comparison

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
│   │   ├── ui/                    # shadcn-svelte components (Button, Card)
│   │   └── DiffViewer.svelte      # Main diff viewer component
│   ├── server/                    # Server-only code (not exposed to client)
│   │   └── db/
│   │       ├── schema.ts          # Drizzle database schema
│   │       ├── index.ts           # Database connection
│   │       └── migrate.ts         # Migration runner
│   └── utils/
│       ├── optimizedDiff.ts       # Performance-optimized diff engine
│       └── utils.ts               # General utilities
├── routes/
│   ├── api/                       # API endpoints
│   │   ├── diff/
│   │   │   ├── +server.ts         # POST /api/diff (create)
│   │   │   └── [id]/+server.ts    # GET /api/diff/[id] (retrieve)
│   │   ├── stats/+server.ts       # GET /api/stats
│   │   └── cleanup/+server.ts     # POST /api/cleanup
│   ├── diff/[id]/                 # Shared diff viewer
│   │   ├── +page.server.ts        # Load diff from DB
│   │   └── +page.svelte           # Display diff UI
│   ├── +layout.svelte             # Root layout
│   └── +page.svelte               # Home page
├── app.css                        # Global styles
└── drizzle.config.ts              # Drizzle configuration
```

## Key Features Explained

### Share Links

Share links save your diff to the database and generate a short, shareable URL (e.g., `/diff/3f9c2e91ab`). When someone opens your shared link, the diff is loaded from the database and displayed automatically. Features:
- **Persistent Storage**: Diffs are saved for 7 days (configurable)
- **Short URLs**: Easy to share and remember
- **View Tracking**: See how many times your diff has been viewed
- **Privacy Options**: Future support for private, token-protected diffs

Perfect for:
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

## API Endpoints

### Create Diff
```http
POST /api/diff
Content-Type: application/json

{
  "textA": "original text",
  "textB": "modified text",
  "ttlDays": 7,
  "isPrivate": false
}
```

Response:
```json
{
  "id": "uuid",
  "shortId": "abc123def",
  "url": "/diff/abc123def",
  "expiresAt": "2024-01-12T00:00:00Z",
  "isPrivate": false
}
```

### Get Diff
```http
GET /api/diff/:id
```

### Get Statistics
```http
GET /api/stats
```

### Cleanup Expired Diffs
```http
POST /api/cleanup
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Run type checking |
| `pnpm lint` | Run linter |
| `pnpm db:push` | Push database schema (dev) |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Drizzle Studio (DB GUI) |

## License

MIT
# diff-viewer
