import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 15;

async function yahooQuote(symbol: string) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) throw new Error(`YF ${resp.status}`);
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) throw new Error("No price");

    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? price;
    const change = price - prev;
    return {
        symbol,
        price,
        change,
        change_percent: prev ? (change / prev) * 100 : 0,
        day_high: meta.regularMarketDayHigh ?? price,
        day_low: meta.regularMarketDayLow ?? price,
        volume: meta.regularMarketVolume ?? 0,
        previous_close: prev,
        currency: meta.currency ?? "INR",
    };
}

// Simple ticker normalizer: add .NS suffix for bare Indian tickers
function normalizeSymbol(query: string): string {
    const q = query.toUpperCase().trim();
    // Already has exchange suffix or is an index/crypto/forex
    if (q.match(/\.(NS|BO)$/) || q.startsWith("^") || q.includes("-USD") || q.includes("=X")) {
        return q;
    }
    // Known indices
    const indexMap: Record<string, string> = {
        NIFTY: "^NSEI", SENSEX: "^BSESN", BANKNIFTY: "^NSEBANK",
        "NIFTY50": "^NSEI", "NIFTY BANK": "^NSEBANK",
    };
    if (indexMap[q]) return indexMap[q];
    // Default: assume NSE
    return `${q}.NS`;
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const rawSymbol: string = body?.symbol ?? "";

    if (!rawSymbol) {
        return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    const symbol = normalizeSymbol(rawSymbol);

    try {
        const quote = await yahooQuote(symbol);
        return NextResponse.json(quote);
    } catch (err: any) {
        // Try without .NS (might be .BO or global)
        try {
            const altSymbol = symbol.replace(".NS", ".BO");
            const quote = await yahooQuote(altSymbol);
            return NextResponse.json(quote);
        } catch {
            return NextResponse.json(
                { error: `Could not fetch quote for ${symbol}: ${err.message}` },
                { status: 404 }
            );
        }
    }
}
