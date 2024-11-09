import Hono, { MiddlewareHandler } from "hono";

export type KeyFn = (ctx: Hono.Context) => string;
export type ReadCacheFn<T> = (
  key: string,
) => undefined | null | T | Promise<T | undefined | null>;
export type InvalidateCacheFn = (key: string) => void | Promise<void>;
export type WriteCacheFn<T> = (key: string, value: T) => void | Promise<void>;

export type MatcherFn = (ctx: Hono.Context) => MatcherFnResponse;
export type MatcherFnResponse = {
  read: boolean;
  write: boolean;
  invalidate: boolean;
};

export type HonoCachingOptions<T> = {
  keyFn?: KeyFn;
  readCacheFn: ReadCacheFn<T>;
  invalidateCacheFn: InvalidateCacheFn;
  writeCacheFn: WriteCacheFn<T>;
  matcher: string[] | MatcherFn;
};

const match = (route: string | URL, matcher: string[], ctx: Hono.Context) => {
  route = route instanceof URL ? route.pathname : route;
  const matched = new RegExp(matcher.join("|")).test(route);
  return {
    read: matched && ctx.req.method === "GET",
    write: matched && ctx.req.method === "GET",
    invalidate: matched && ctx.req.method !== "GET",
  };
};

const defaultKeyFn: KeyFn = (ctx) => `__key_:${ctx.req.path}`;

const serverCache = <T = any>(
  opts: HonoCachingOptions<T>,
): MiddlewareHandler => {
  const {
    keyFn = defaultKeyFn,
    readCacheFn,
    invalidateCacheFn,
    writeCacheFn,
    matcher,
  } = opts;
  return async (ctx, next) => {
    ctx.header("X-Cache", "MISS");
    const {
      read: shouldRead,
      write: shouldWrite,
      invalidate: shouldInvalidate,
    } = matcher instanceof Array
      ? match(ctx.req.path, matcher, ctx)
      : matcher(ctx);

    const key = keyFn(ctx);

    if (shouldInvalidate) {
      await invalidateCacheFn(key);
    }

    if (shouldRead) {
      const data = await readCacheFn(key);
      if (data !== null && data !== undefined) {
        ctx.header("X-Cache", "HIT");
        return ctx.json(data);
      }
    }

    if (shouldWrite) {
      const oldFn: (...args: Parameters<typeof ctx.json>) => any = ctx.json;
      ctx.json = (...args: Parameters<typeof ctx.json>) => {
        writeCacheFn(key, args[0] as any);
        return oldFn(...args);
      };
      return await next();
    }

    return await next();
  };
};

export { serverCache };
