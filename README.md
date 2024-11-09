# hono-server-cache-middleware

`hono-server-cache-middleware` makes it easier to implement server side caching and invalidation in your [hono](https://hono.dev/) application. It is different from the [cache middleware](https://hono.dev/docs/middleware/builtin/cache) provided by hono.

# hono-server-cache

A lightweight and flexible server-side caching middleware for Hono applications. This package provides an easy way to implement response caching and cache invalidation strategies.

## Features

- 🚀 Simple integration with Hono applications
- 🎯 Flexible cache key generation
- 🔄 Automatic cache invalidation on non-GET requests
- ⚙️ Customizable cache storage backends
- 🎨 Route-based cache matching
- 📊 Cache hit/miss headers

## Installation

```bash
npm install hono-server-cache
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { serverCache } from 'hono-server-cache'

const app = new Hono()

// Example using an in-memory cache
const cache = new Map()

app.use(serverCache({
  // Cache all routes under /api
  matcher: ['/api/*'],
  
  // Cache operations
  readCacheFn: (key) => cache.get(key),
  writeCacheFn: (key, value) => cache.set(key, value),
  invalidateCacheFn: (key) => cache.delete(key)
}))
```

## API Reference

### `serverCache(options: HonoCachingOptions)`

Creates a middleware function for handling server-side caching.

#### Options

```typescript
type HonoCachingOptions<T> = {
  keyFn?: (ctx: Hono.Context) => string
  readCacheFn: (key: string) => T | undefined | null | Promise<T | undefined | null>
  writeCacheFn: (key: string, value: T) => void | Promise<void>
  invalidateCacheFn: (key: string) => void | Promise<void>
  matcher: string[] | ((ctx: Hono.Context) => MatcherFnResponse)
}
```

- `keyFn`: Function to generate cache keys. By default, it uses request path to generate key
- `readCacheFn`: Function to read from cache
- `writeCacheFn`: Function to write to cache
- `invalidateCacheFn`: Function to invalidate cache entries
- `matcher`: Array of route patterns or function to determine cache behavior

### Matcher Response

```typescript
type MatcherFnResponse = {
  read: boolean    // Whether to attempt reading from cache
  write: boolean   // Whether to cache the response
  invalidate: boolean  // Whether to invalidate the cache
}
```

## Examples

### Custom Cache Key Generation

```typescript
app.use(serverCache({
  matcher: ['/api/*'],
  keyFn: (ctx) => `_key:${ctx.req.path}:${ctx.req.query('version')}`,
  // ... cache functions
}))
```

### Custom Matcher Function

```typescript
app.use(serverCache({
  matcher: (ctx) => ({
    read: ctx.req.method === 'GET',
    write: ctx.req.method === 'GET',
    invalidate: ctx.req.method === 'POST'
  }),
  // ... cache functions
}))
```

### Redis Backend Example

```typescript
import { Redis } from 'ioredis'

const redis = new Redis()

app.use(serverCache({
  matcher: ['/api/*'],
  readCacheFn: async (key) => {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  },
  writeCacheFn: async (key, value) => {
    await redis.set(key, JSON.stringify(value))
  },
  invalidateCacheFn: async (key) => {
    await redis.del(key)
  }
}))
```

## Cache Headers

The middleware automatically adds an `X-Cache` header to responses:
- `X-Cache: HIT` - Response was served from cache
- `X-Cache: MISS` - Response was generated fresh

## Behavior

1. For GET requests matching the cache patterns:
   - Attempts to read from cache first
   - If cache miss, executes the handler and caches the response
2. For non-GET requests:
   - Invalidates the cache for the matching key
   - Processes the request normally

## License

MIT

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
