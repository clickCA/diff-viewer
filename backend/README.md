# Diff Viewer Backend

High-performance backend API for storing and sharing text diffs with PostgreSQL and Drizzle ORM.

## Features

- 🚀 **Fast & Scalable**: Built with Fastify for high performance
- 🗃️ **Type-Safe Database**: Drizzle ORM with TypeScript
- 🔒 **Private Diffs**: Optional token-based access control
- ⏰ **TTL Support**: Automatic expiration and cleanup
- 📊 **Analytics**: View counts and statistics
- 🐳 **Docker Ready**: Full Docker Compose setup

## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Language**: TypeScript
- **Runtime**: Node.js 20

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized setup)
- PostgreSQL 16+ (for local development)

### Quick Start with Docker

```bash
# Start the entire stack
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

The API will be available at `http://localhost:3001`

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Drizzle migrations
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

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
  "shortId": "3f9c2e91ab",
  "url": "/diff/3f9c2e91ab",
  "expiresAt": "2024-01-12T00:00:00Z",
  "isPrivate": false
}
```

### Get Diff

```http
GET /api/diff/:id
```

Optional query parameter for private diffs:
```http
GET /api/diff/:id?token=abc123
```

Response:
```json
{
  "id": "uuid",
  "shortId": "3f9c2e91ab",
  "textA": "original text",
  "textB": "modified text",
  "textASize": 13,
  "textBSize": 13,
  "createdAt": "2024-01-05T00:00:00Z",
  "expiresAt": "2024-01-12T00:00:00Z",
  "viewCount": 42
}
```

### Health Check

```http
GET /health
```

### Stats

```http
GET /api/stats
```

Response:
```json
{
  "totalDiffs": 1234,
  "totalViews": 5678,
  "avgSize": 2048
}
```

### Cleanup Expired Diffs

```http
POST /api/cleanup
```

Response:
```json
{
  "deleted": 15,
  "timestamp": "2024-01-05T12:00:00Z"
}
```

## Database Schema

```typescript
diffDocuments {
  id: UUID (primary key)
  shortId: string (unique, for URLs)
  textA: text
  textB: text
  textASize: integer
  textBSize: integer
  computedDiff: text (optional, for caching)
  ttlDays: integer (default: 7)
  expiresAt: timestamp
  isPrivate: boolean (default: false)
  accessToken: string (for private diffs)
  createdAt: timestamp
  updatedAt: timestamp
  viewCount: integer (default: 0)
}
```

## Drizzle Commands

```bash
# Generate migrations from schema
npm run db:generate

# Push schema directly to database (dev)
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Environment Variables

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/diffviewer
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

## Performance Considerations

- **Text Size Limit**: 5MB per text field
- **TTL**: Default 7 days, configurable per diff
- **Indexing**: `shortId` is indexed for fast lookups
- **Cleanup**: Run `/api/cleanup` periodically via cron

## Security

- Input validation on all endpoints
- Size limits to prevent abuse
- Token-based access for private diffs
- CORS configuration
- SQL injection protection via Drizzle ORM

## Production Deployment

1. Build the Docker image:
```bash
docker build -t diff-viewer-backend --target production .
```

2. Run with environment variables:
```bash
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e CORS_ORIGIN=https://your-domain.com \
  diff-viewer-backend
```

3. Set up a cron job for cleanup:
```bash
0 0 * * * curl -X POST http://localhost:3001/api/cleanup
```

## License

MIT
