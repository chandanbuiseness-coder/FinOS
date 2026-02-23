/**
 * Returns the correct Tenali API base URL for any environment:
 *
 *  Local dev (Next.js): NEXT_PUBLIC_TENALI_API_URL = http://localhost:8000/api/py → used as-is
 *  Vercel server-side:  NEXT_PUBLIC_TENALI_API_URL = http://localhost:8000/api/py
 *                       → auto-corrected to /api/py (Vercel serverless function)
 *  Vercel client-side:  same correction via window.location check
 *  Production domain:   env var not set → /api/py default
 */
export function getTenaliApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_TENALI_API_URL || "/api/py";

    // ── Server-side (SSR / API routes): Vercel sets VERCEL=1 ─────────────────
    if (typeof window === "undefined") {
        // On Vercel server-side, localhost URLs are meaningless → use relative path
        if (process.env.VERCEL && raw.includes("localhost")) {
            return "/api/py";
        }
        return raw;
    }

    // ── Client-side: detect if we're on a real domain but env says localhost ──
    if (raw.includes("localhost") && !window.location.hostname.includes("localhost")) {
        return "/api/py";
    }

    return raw;
}
