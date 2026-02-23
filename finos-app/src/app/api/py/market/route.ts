import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

// Yahoo Finance v8 API — free, no key needed
async function fetchYFQuote(symbol: string) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
    });
    if (!resp.ok) throw new Error(`YF ${resp.status}`);
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("No data");
    const price = meta.regularMarketPrice ?? 0;
    const prev = meta.previousClose ?? price;
    return {
        price,
        change: price - prev,
        change_percent: prev ? ((price - prev) / prev) * 100 : 0,
    };
}

function marketStatus(symbol: string): string {
    const now = new Date();
    const day = now.getUTCDay();
    if (symbol.includes("-USD")) return "Open"; // crypto 24/7
    if (symbol.includes("=X")) return "Open";   // forex
    if (symbol.includes(".NS") || symbol.includes(".BO") || ["^NSEI", "^BSESN", "^NSEBANK"].includes(symbol)) {
        // IST = UTC+5:30
        const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
        const h = ist.getUTCHours(), m = ist.getUTCMinutes();
        const min = h * 60 + m;
        if (day === 0 || day === 6) return "Closed";
        if (min >= 555 && min < 570) return "Pre-Open"; // 9:15–9:30 IST
        if (min >= 570 && min <= 930) return "Open";    // 9:30–15:30 IST
        return "Closed";
    }
    // US markets (ET = UTC-5)
    const et = new Date(now.getTime() - 5 * 3600 * 1000);
    const etH = et.getUTCHours(), etM = et.getUTCMinutes();
    const etMin = etH * 60 + etM;
    if (day === 0 || day === 6) return "Closed";
    return etMin >= 570 && etMin <= 960 ? "Open" : "Closed";
}

const TICKERS: Record<string, { name: string; type: string }> = {
    "^NSEI": { name: "Nifty 50", type: "INDEX" },
    "^BSESN": { name: "Sensex", type: "INDEX" },
    "^NSEBANK": { name: "Bank Nifty", type: "INDEX" },
    "^GSPC": { name: "S&P 500", type: "INDEX" },
    "^DJI": { name: "Dow Jones", type: "INDEX" },
    "^IXIC": { name: "Nasdaq", type: "INDEX" },
    "BTC-USD": { name: "Bitcoin", type: "CRYPTO" },
    "ETH-USD": { name: "Ethereum", type: "CRYPTO" },
    "SOL-USD": { name: "Solana", type: "CRYPTO" },
    "INR=X": { name: "USD/INR", type: "FOREX" },
    "EURINR=X": { name: "EUR/INR", type: "FOREX" },
};

export async function GET(_req: NextRequest) {
    const results = await Promise.allSettled(
        Object.entries(TICKERS).map(async ([symbol, meta]) => {
            const q = await fetchYFQuote(symbol);
            return {
                symbol,
                name: meta.name,
                type: meta.type,
                status: marketStatus(symbol),
                ...q,
            };
        })
    );

    const items = results.map((r, i) => {
        const symbol = Object.keys(TICKERS)[i];
        const meta = TICKERS[symbol];
        if (r.status === "fulfilled") return r.value;
        return { symbol, name: meta.name, type: meta.type, status: "Unknown", price: 0, change: 0, change_percent: 0, source: "UNAVAILABLE" };
    });

    return NextResponse.json({ items, status: "ok" }, {
        headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    });
}
