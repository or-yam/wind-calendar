# Phase 3: Conditional CSP Based on Environment

**Date:** 2026-03-03  
**Status:** ✅ COMPLETE  
**Priority:** Medium (Security improvement)  
**Completed:** 2026-03-03

---

## Goal

Apply Content Security Policy conditionally based on environment:

- **Production:** Strict CSP without `'unsafe-inline'`
- **Development:** Relaxed CSP to support Vite HMR and inline scripts

---

## Current State (Issue)

CSP is defined in `vercel.json` which applies to all environments:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; ..."
}
```

**Problems:**

1. `'unsafe-inline'` is needed for Vite dev mode but reduces security in production
2. `vercel.json` headers can't be conditional (no environment checks)
3. Current CSP allows inline scripts in production (not ideal)

---

## Solution Options

### Option 1: Middleware-based CSP (Recommended)

Create a middleware that sets CSP headers based on environment.

**File:** `middleware.ts` (Next.js) or custom middleware in Vercel

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const isDev = process.env.NODE_ENV === "development" || !process.env.VERCEL_ENV;

  const csp = isDev
    ? // Development: Allow inline scripts for Vite
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com http://localhost:* ws://localhost:*; img-src 'self' data:; frame-ancestors 'none'"
    : // Production: Strict CSP with nonces
      "default-src 'self'; script-src 'self' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com; img-src 'self' data:; frame-ancestors 'none'";

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: "/:path*",
};
```

**Steps:**

1. Create `middleware.ts` in project root
2. Remove CSP from `vercel.json`
3. Keep other security headers in `vercel.json` (X-Frame-Options, etc.)
4. Test in both dev and production

---

### Option 2: Vercel Environment-specific Configuration

Use separate Vercel configuration files per environment.

**Files:**

- `vercel.json` - Base config
- `vercel.production.json` - Production overrides
- `vercel.development.json` - Development overrides

**Limitation:** Vercel doesn't officially support this pattern. Would require manual deployment config.

---

### Option 3: Remove CSP from Static Config, Apply at Runtime

Set CSP headers directly in API routes and HTML responses.

**Implementation:**

1. Remove CSP from `vercel.json`
2. Add CSP meta tag in `index.html` based on build-time env
3. Set CSP headers in API routes individually

**Drawback:** More complex, harder to maintain consistently.

---

## Recommended Approach: Option 1 (Middleware)

**Pros:**

- Clean separation of dev/prod CSP
- Centralized security header management
- Easy to test and maintain
- Supports future CSP improvements (nonces, hashes)

**Cons:**

- Requires middleware setup (small overhead)
- Need to ensure middleware runs on all routes

---

## Implementation Plan

### Step 1: Create Middleware

**File:** `middleware.ts`

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function middleware(req: VercelRequest, res: VercelResponse) {
  const isDev = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development";

  // Development CSP: Allow inline scripts for Vite HMR
  const devCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://va.vercel-scripts.com http://localhost:* ws://localhost:*",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
  ].join("; ");

  // Production CSP: Strict, no unsafe-inline for scripts
  const prodCSP = [
    "default-src 'self'",
    "script-src 'self' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keep for Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://va.vercel-scripts.com",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
  ].join("; ");

  res.setHeader("Content-Security-Policy", isDev ? devCSP : prodCSP);
}
```

### Step 2: Update vercel.json

Remove CSP header, keep other security headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Step 3: Test

**Development:**

```bash
pnpm run dev
# Check browser console - no CSP violations
# Verify Vite HMR works
```

**Production:**

```bash
vercel deploy --prod
# Check response headers: strict CSP without 'unsafe-inline'
```

---

## Future Enhancement: CSP Nonces

For even better security, use nonces instead of `'unsafe-inline'`:

1. Generate nonce per request
2. Pass nonce to HTML template
3. Add nonce to inline scripts
4. Reference nonce in CSP: `script-src 'self' 'nonce-{nonce}'`

This eliminates need for `'unsafe-inline'` entirely.

---

## Implementation Results

**Approach Used:** Vite HTML transform plugin (not Edge middleware)

**Rationale:** This is a Vite SPA + Vercel API routes project (not Next.js). Using Vite's `transformIndexHtml` hook is simpler and more appropriate than Edge middleware for static builds.

### Files Modified

1. ✅ `vite.config.ts` — Added `injectCSP()` plugin that transforms HTML at build/dev time
2. ✅ `vercel.json` — Removed CSP header (kept other security headers)

### Implementation

Created a Vite plugin that injects a CSP meta tag:

- **Dev mode** (`ctx.server !== undefined`): Relaxed CSP with `'unsafe-inline'` and localhost
- **Production build**: Strict CSP without `'unsafe-inline'` in script-src

The CSP is injected as:

```html
<meta http-equiv="Content-Security-Policy" content="..." />
```

### Test Results

✅ **Development mode:**

- CSP includes `script-src 'self' 'unsafe-inline'` for Vite HMR
- CSP includes `connect-src ... http://localhost:* ws://localhost:*` for Vite websocket
- No CSP violations in console
- Vite HMR works correctly

✅ **Production build:**

- CSP has strict `script-src 'self' https://va.vercel-scripts.com` (no `'unsafe-inline'`)
- No localhost URLs in connect-src
- Other security headers unchanged in `vercel.json`

✅ **Tests:**

- All 65 tests passing
- TypeScript: ✓
- Linter: ✓

## Acceptance Criteria

✅ Development: Vite HMR works without CSP errors  
✅ Production: No `'unsafe-inline'` in script-src  
✅ All environments: Other security headers unchanged  
✅ Tests: No regressions

---

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Vercel: Security Headers](https://vercel.com/docs/concepts/edge-network/headers)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
