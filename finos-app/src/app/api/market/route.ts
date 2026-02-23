/**
 * Next.js API Route: /api/market
 * Fetches live index/commodity data directly from Yahoo Finance.
 * This is a JS serverless function — works on Vercel WITHOUT the Python backend.
 * Caches 60 seconds via Next.js fetch cache.
 */
import { NextResponse } from "next/server";

const INDICES = [
    { symbol: "^NSEI", name: "Nifty 50" },
    { symbol: "^BSESN", name: "Sensex" },
    { symbol: "^NSEBANK", name: "Bank Nifty" },
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^IXIC", name: "Nasdaq" },
    { symbol: "GC=F", name: "Gold" },
    { symbol: "CL=F", name: "Crude Oil" },
];

async function fetchYahoo(symbol: string) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        },
        // Cache for 60 seconds on Vercel edge
        next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const json = await r.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    return { price, change, changePct };
}

export async function GET() {
    const results = await Promise.allSettled(
        INDICES.map(async (idx) => {
            const data = await fetchYahoo(idx.symbol);
            const price = data?.price ?? 0;
            const change = data?.change ?? 0;
            const changePct = data?.changePct ?? 0;
            return {
                symbol: idx.symbol,
                name: idx.name,
                price,
                change: parseFloat(change.toFixed(2)),
                change_percent: parseFloat(changePct.toFixed(2)),
                type: "INDEX",
                status: price > 0 ? "Live" : "Unavailable",
            };
        })
    );

    const items = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<any>).value);

    return NextResponse.json(
        { items, source: "yahoo-finance", fetched_at: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
    );
}
