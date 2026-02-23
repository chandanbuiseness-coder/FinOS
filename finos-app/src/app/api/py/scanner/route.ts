import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Scanner needs longer timeout
export const maxDuration = 60;

// ── Nifty 500 Universe (liquid, top stocks per sector) ─────────────────────
const NIFTY500 = [
    // Large Cap / Nifty 50
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "BHARTIARTL.NS", "ICICIBANK.NS",
    "INFY.NS", "SBIN.NS", "ITC.NS", "HINDUNILVR.NS", "LT.NS",
    "KOTAKBANK.NS", "AXISBANK.NS", "MARUTI.NS", "WIPRO.NS", "SUNPHARMA.NS",
    "ULTRACEMCO.NS", "TITAN.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "TATAMOTORS.NS",
    "HCLTECH.NS", "TECHM.NS", "INDUSINDBK.NS", "ADANIPORTS.NS", "NTPC.NS",
    "POWERGRID.NS", "COALINDIA.NS", "ONGC.NS", "BPCL.NS", "TATASTEEL.NS",
    "HINDALCO.NS", "DRREDDY.NS", "CIPLA.NS", "JSWSTEEL.NS", "EICHERMOT.NS",
    "HEROMOTOCO.NS", "BRITANNIA.NS", "NESTLEIND.NS", "TATACONSUM.NS", "ZOMATO.NS",
    "BEL.NS", "TATAPOWER.NS", "BAJAJ-AUTO.NS", "SHRIRAMFIN.NS",
    // IT / Tech
    "LTIM.NS", "PERSISTENT.NS", "COFORGE.NS", "MPHASIS.NS", "TATAELXSI.NS",
    "KPITTECH.NS", "OFSS.NS", "CYIENT.NS", "LATENTVIEW.NS", "BIRLASOFT.NS",
    // Banking / NBFC
    "BANKBARODA.NS", "PNB.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS",
    "CHOLAFIN.NS", "RECLTD.NS", "PFC.NS", "IRFC.NS", "MUTHOOTFIN.NS", "SBICARD.NS",
    "HDFCAMC.NS", "ICICIGI.NS", "SBILIFE.NS", "HDFCLIFE.NS",
    // Pharma
    "LUPIN.NS", "BIOCON.NS", "ALKEM.NS", "TORNTPHARM.NS", "AUROPHARMA.NS",
    "DIVISLAB.NS", "ABBOTINDIA.NS", "GLENMARK.NS", "LAURUSLABS.NS", "AJANTPHARM.NS",
    // FMCG
    "GODREJCP.NS", "DABUR.NS", "MARICO.NS", "COLPAL.NS", "EMAMILTD.NS", "VBL.NS",
    // Auto
    "MRF.NS", "BALKRISIND.NS", "APOLLOTYRE.NS", "MOTHERSON.NS", "BOSCHLTD.NS",
    "BHARATFORG.NS", "TVSMOTOR.NS",
    // Capital Goods
    "SIEMENS.NS", "ABB.NS", "HAVELLS.NS", "CUMMINSIND.NS", "THERMAX.NS",
    "BHEL.NS", "VOLTAS.NS", "DIXON.NS", "POLYCAB.NS", "KEI.NS",
    // Cement / Real Estate
    "JKCEMENT.NS", "RAMCOCEM.NS", "DLF.NS", "GODREJPROP.NS", "PRESTIGE.NS",
    // Energy
    "GAIL.NS", "IGL.NS", "PETRONET.NS", "ADANIGREEN.NS", "TATAPOWER.NS", "NHPC.NS",
    // Chemicals
    "PIIND.NS", "DEEPAKNTR.NS", "SRF.NS", "NAVINFLUOR.NS", "AARTI.NS",
    // Metals
    "SAIL.NS", "VEDL.NS", "HINDZINC.NS", "APLAPOLLO.NS",
    // Infrastructure
    "IRCTC.NS", "CONCOR.NS", "GMRINFRA.NS", "IRB.NS", "DELHIVERY.NS",
    // Consumer Tech
    "NAUKRI.NS", "DMART.NS", "PAYTM.NS", "POLICYBZR.NS",
    // Paints / Lifestyle
    "BERGEPAINT.NS", "ASTRAL.NS", "PIDILITIND.NS", "KALYANKJIL.NS",
];

// ── In-memory cache ────────────────────────────────────────────────────────
const cache = new Map<string, { t: number; d: object }>();

// ── Yahoo Finance fetch for a single symbol ───────────────────────────────
interface OHLCVRow { open: number; high: number; low: number; close: number; volume: number; }

async function fetchHistory(symbol: string, range: string, interval: string): Promise<OHLCVRow[]> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = q.open ?? [];
    const highs: number[] = q.high ?? [];
    const lows: number[] = q.low ?? [];
    const closes: number[] = q.close ?? [];
    const volumes: number[] = q.volume ?? [];

    return timestamps
        .map((_, i) => ({
            open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i],
        }))
        .filter((r) => r.close != null && !isNaN(r.close));
}

// ── Statistical helpers ────────────────────────────────────────────────────
function ema(arr: number[], span: number): number[] {
    const k = 2 / (span + 1);
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
        if (i === 0) { out.push(arr[0]); continue; }
        out.push(arr[i] * k + out[i - 1] * (1 - k));
    }
    return out;
}

function rsi(closes: number[], period = 14): number[] {
    const diffs = closes.slice(1).map((c, i) => c - closes[i]);
    const gains = diffs.map((d) => Math.max(d, 0));
    const losses = diffs.map((d) => Math.max(-d, 0));
    const out: number[] = new Array(period).fill(NaN);
    let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    for (let i = period; i < diffs.length; i++) {
        ag = (ag * (period - 1) + gains[i]) / period;
        al = (al * (period - 1) + losses[i]) / period;
        out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return out;
}

function rollingMean(arr: number[], period: number): number[] {
    return arr.map((_, i) => {
        if (i < period - 1) return NaN;
        const slice = arr.slice(i - period + 1, i + 1).filter((v) => !isNaN(v));
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
}

function rollingStd(arr: number[], period: number): number[] {
    return arr.map((_, i) => {
        if (i < period - 1) return NaN;
        const slice = arr.slice(i - period + 1, i + 1).filter((v) => !isNaN(v));
        const m = slice.reduce((a, b) => a + b, 0) / slice.length;
        return Math.sqrt(slice.reduce((a, b) => a + (b - m) ** 2, 0) / slice.length);
    });
}

function atr(rows: OHLCVRow[], period = 14): number[] {
    const tr = rows.map((r, i) => {
        if (i === 0) return r.high - r.low;
        const pc = rows[i - 1].close;
        return Math.max(r.high - r.low, Math.abs(r.high - pc), Math.abs(r.low - pc));
    });
    return rollingMean(tr, period);
}

function last<T>(arr: T[]): T { return arr[arr.length - 1]; }
function prev<T>(arr: T[], n = 2): T { return arr[arr.length - n]; }

// ── Signal builder ────────────────────────────────────────────────────────
function build(
    sym: string, algo: string, algoType: string, signal: string,
    entry: number, sl: number, t1: number, t2: number,
    confidence: number, timeframe: string, detail: string, rr: string, tags: string[]
) {
    return {
        symbol: sym.replace(".NS", "").replace(".BO", ""),
        algorithm: algo, algo_type: algoType, signal,
        entry: +entry.toFixed(1), stop_loss: +sl.toFixed(1),
        target_1: +t1.toFixed(1), target_2: +t2.toFixed(1),
        confidence, timeframe, detail, risk_reward: rr, tags,
    };
}

// ── Algorithms ────────────────────────────────────────────────────────────

async function scan52WBreakout(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const rows = await fetchHistory(sym, "1y", "1d");
            if (rows.length < 100) continue;
            const closes = rows.map((r) => r.close);
            const volumes = rows.map((r) => r.volume);
            const highs = rows.map((r) => r.high);
            const lows = rows.map((r) => r.low);
            const hi52 = Math.max(...closes);
            const cur = last(closes);
            const avgVol = rollingMean(volumes, 20);
            const curVol = last(volumes);
            const avgV = last(avgVol);
            if (isNaN(avgV) || avgV === 0) continue;
            const pct = (cur - hi52) / hi52 * 100;
            if (pct >= -3.5 && pct <= 0.5 && curVol > avgV * 1.4) {
                const atrArr = atr(rows);
                const atrV = last(atrArr);
                const conf = Math.min(93, Math.floor(65 + Math.min(25, (curVol / avgV - 1.4) * 18)));
                results.push(build(sym, "52W High Breakout", "swing", "BUY",
                    cur, cur * 0.92, cur * 1.10, cur * 1.20, conf,
                    "Swing (2-6 weeks)", `Within ${Math.abs(pct).toFixed(1)}% of 52W high. Vol ${(curVol / avgV).toFixed(1)}x.`,
                    "1:1.4", ["Momentum", "Breakout"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

async function scanRSIBounce(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const rows = await fetchHistory(sym, "1y", "1d");
            if (rows.length < 60) continue;
            const closes = rows.map((r) => r.close);
            const volumes = rows.map((r) => r.volume);
            const highs = rows.map((r) => r.high);
            const lows = rows.map((r) => r.low);
            const rsiArr = rsi(closes);
            const cur = last(closes);
            const prevRsi = prev(rsiArr);
            const curRsi = last(rsiArr);
            if (isNaN(prevRsi) || isNaN(curRsi)) continue;
            const avgVol = rollingMean(volumes, 20);
            const curVol = last(volumes);
            const avgV = last(avgVol);
            const atrArr = atr(rows);
            const atrV = last(atrArr);
            const ma200 = closes.length >= 200 ? rollingMean(closes, 200) : null;
            const d200 = ma200 ? last(ma200) : cur * 0.9;
            if (prevRsi < 35 && curRsi > prevRsi + 1 && cur > d200 * 0.98 && curVol > avgV) {
                const conf = Math.min(88, Math.floor(55 + (35 - prevRsi) * 2 + (curVol / avgV - 1) * 5));
                results.push(build(sym, "RSI Oversold Bounce", "swing", "BUY",
                    cur, cur - 2 * atrV, cur + 3 * atrV, cur + 5 * atrV, conf,
                    "Swing (1-3 weeks)", `RSI ${prevRsi.toFixed(0)}→${curRsi.toFixed(0)}. Above 200DMA.`,
                    "1:1.5", ["RSI", "Mean Reversion"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

async function scanEMACross(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const rows = await fetchHistory(sym, "3mo", "1d");
            if (rows.length < 25) continue;
            const closes = rows.map((r) => r.close);
            const volumes = rows.map((r) => r.volume);
            const highs = rows.map((r) => r.high);
            const lows = rows.map((r) => r.low);
            const e9 = ema(closes, 9);
            const e21 = ema(closes, 21);
            const cur = last(closes);
            const atrArr = atr(rows);
            const atrV = last(atrArr);
            const avgVol = rollingMean(volumes, 20);
            const curVol = last(volumes);
            const avgV = last(avgVol);
            const bull = prev(e9) <= prev(e21) && last(e9) > last(e21);
            const bear = prev(e9) >= prev(e21) && last(e9) < last(e21);
            if (bull || bear) {
                const sig = bull ? "BUY" : "SELL";
                const m = bull ? 1 : -1;
                const conf = Math.min(85, Math.floor(60 + (curVol / avgV - 1) * 10));
                results.push(build(sym, "EMA 9/21 Crossover", "swing", sig,
                    cur, cur - m * 1.5 * atrV, cur + m * 2.5 * atrV, cur + m * 4 * atrV, conf,
                    "Swing (5-15 days)", `EMA9 ${bull ? "above" : "below"} EMA21. Vol ${(curVol / avgV).toFixed(1)}x.`,
                    "1:1.7", ["Trend", "EMA Crossover"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

async function scanBBSqueeze(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const rows = await fetchHistory(sym, "3mo", "1d");
            if (rows.length < 30) continue;
            const closes = rows.map((r) => r.close);
            const highs = rows.map((r) => r.high);
            const lows = rows.map((r) => r.low);

            const bbMid = rollingMean(closes, 20);
            const bbStd = rollingStd(closes, 20);
            const bbu = bbMid.map((m, i) => m + 2 * (bbStd[i] ?? 0));
            const bbl = bbMid.map((m, i) => m - 2 * (bbStd[i] ?? 0));

            const atrArr = atr(rows);
            const emaArr = ema(closes, 20);
            const kcu = emaArr.map((m, i) => m + 1.5 * (atrArr[i] ?? 0));
            const kcl = emaArr.map((m, i) => m - 1.5 * (atrArr[i] ?? 0));

            const sqOn = last(bbu) < last(kcu) && last(bbl) > last(kcl);
            const sqOff = (prev(bbu) < prev(kcu) && prev(bbl) > prev(kcl)) && !sqOn;

            if (sqOn || sqOff) {
                const cur = last(closes);
                const fiveAgo = closes[closes.length - 6];
                const mom = fiveAgo ? (cur - fiveAgo) / fiveAgo * 100 : 0;
                const sig = mom >= 0 ? "BUY" : "SELL";
                const m = mom >= 0 ? 1 : -1;
                const atrV = last(atrArr);
                const conf = sqOff ? 78 : 66;
                results.push(build(sym, "BB Squeeze (TTM)", "swing", sig,
                    cur, cur - m * 1.5 * atrV, cur + m * 3 * atrV, cur + m * 5 * atrV, conf,
                    "Swing (2-4 weeks)", `${sqOff ? "Squeeze released!" : "Coiling."} Mom ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}% (5d).`,
                    "1:2", ["Squeeze", "Volatility"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

async function scanSupertrend(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const rows = await fetchHistory(sym, "3mo", "1d");
            if (rows.length < 30) continue;
            const closes = rows.map((r) => r.close);
            const highs = rows.map((r) => r.high);
            const lows = rows.map((r) => r.low);
            const volumes = rows.map((r) => r.volume);
            const atr10 = atr(rows, 10);
            const hl2 = rows.map((r) => (r.high + r.low) / 2);
            const lb = hl2.map((h, i) => h - 3 * (atr10[i] ?? 0));
            const e9 = ema(closes, 9);
            const e21 = ema(closes, 21);
            const cur = last(closes);
            const stUp = last(lb);
            const bull = cur > stUp && prev(closes) > prev(lb);
            const emaBull = last(e9) > last(e21);
            const avgVol = rollingMean(volumes, 20);
            const curVol = last(volumes);
            const avgV = last(avgVol);
            const atrV = last(atr10);
            if (bull && emaBull && curVol > avgV) {
                const conf = Math.min(82, Math.floor(68 + (curVol / avgV - 1) * 8));
                results.push(build(sym, "Supertrend + EMA", "intraday", "BUY",
                    cur, stUp * 0.998, cur + 2 * atrV, cur + 3.5 * atrV, conf,
                    "Intraday / Positional", `Supertrend bullish. EMA9>EMA21. Vol ${(curVol / avgV).toFixed(1)}x.`,
                    "1:2", ["Supertrend", "Trend"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

async function scanQualityValue(symbols: string[]) {
    const results = [];
    for (const sym of symbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
            const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
            if (!resp.ok) continue;
            const data = await resp.json();
            const meta = data?.chart?.result?.[0]?.meta;
            if (!meta?.regularMarketPrice) continue;

            const price = meta.regularMarketPrice;
            // Try to get fundamental data
            const statsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=defaultKeyStatistics,financialData`;
            const statsResp = await fetch(statsUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
            if (!statsResp.ok) continue;
            const statsData = await statsResp.json();
            const fd = statsData?.quoteSummary?.result?.[0]?.financialData ?? {};
            const ks = statsData?.quoteSummary?.result?.[0]?.defaultKeyStatistics ?? {};

            const roe = (fd?.returnOnEquity?.raw ?? 0) * 100;
            const pe = ks?.forwardPE?.raw ?? 0;
            const de = fd?.debtToEquity?.raw ?? 999;
            const eg = (fd?.earningsGrowth?.raw ?? 0) * 100;
            const rg = (fd?.revenueGrowth?.raw ?? 0) * 100;

            if (roe < 15 || de > 100 || pe <= 0 || price <= 0) continue;

            let score = 0;
            if (roe > 20) score += 20; else if (roe > 15) score += 12;
            if (de < 30) score += 20; else if (de < 60) score += 12;
            if (eg > 15) score += 25; else if (eg > 10) score += 15;
            if (rg > 10) score += 15;
            if (pe < 25) score += 10;

            if (score >= 45) {
                results.push(build(sym, "Quality Value Score", "longterm", "ACCUMULATE",
                    price, price * 0.85, price * 1.20, price * 1.40,
                    Math.min(90, score), "Long-term (3-12 months)",
                    `ROE ${roe.toFixed(0)}% | D/E ${de.toFixed(0)} | EPS growth ${eg >= 0 ? "+" : ""}${eg.toFixed(0)}% | Score ${score}/100`,
                    "1:3", ["Quality", "Value", "Fundamental"]));
            }
        } catch { /* skip */ }
    }
    return results;
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type") ?? "swing";
    const cacheKey = `${type}_${new Date().toISOString().slice(0, 10)}`;

    // Return cached result if fresh (< 15 minutes)
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.t < 15 * 60 * 1000) {
        return NextResponse.json(cached.d);
    }

    // Deduplicate universe
    const universe = [...new Set(NIFTY500)];
    let signals: object[] = [];

    try {
        if (type === "intraday") {
            const [st] = await Promise.allSettled([
                scanSupertrend(universe.slice(0, 60)),
            ]);
            if (st.status === "fulfilled") signals = signals.concat(st.value);
        } else if (type === "swing") {
            const [s52, srsi, sema, sbb] = await Promise.allSettled([
                scan52WBreakout(universe.slice(0, 80)),
                scanRSIBounce(universe.slice(0, 80)),
                scanEMACross(universe.slice(0, 80)),
                scanBBSqueeze(universe.slice(0, 60)),
            ]);
            if (s52.status === "fulfilled") signals = signals.concat(s52.value);
            if (srsi.status === "fulfilled") signals = signals.concat(srsi.value);
            if (sema.status === "fulfilled") signals = signals.concat(sema.value);
            if (sbb.status === "fulfilled") signals = signals.concat(sbb.value);
        } else if (type === "longterm") {
            const [sqv] = await Promise.allSettled([
                scanQualityValue(universe.slice(0, 25)),
            ]);
            if (sqv.status === "fulfilled") signals = signals.concat(sqv.value);
        }
    } catch (err) {
        console.error("Scanner error:", err);
    }

    // Deduplicate by symbol+algo, sort by confidence
    const seen = new Set<string>();
    const unique: object[] = [];
    for (const s of signals as any[]) {
        const k = `${s.symbol}_${s.algorithm}`;
        if (!seen.has(k)) { seen.add(k); unique.push(s); }
    }
    unique.sort((a: any, b: any) => b.confidence - a.confidence);

    // ── Market Status Check (India: 9:15 AM - 3:30 PM IST) ───────────────────
    const now = new Date();
    // Use Intl to get IST time components regardless of server location
    const istTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).format(now);

    const [istHour, istMin] = istTime.split(":").map(Number);
    const day = now.getUTCDay(); // 0=Sun, 6=Sat

    const isWeekend = day === 0 || day === 6;
    const isTradingHours = !isWeekend && (
        (istHour > 9 || (istHour === 9 && istMin >= 15)) &&
        (istHour < 15 || (istHour === 15 && istMin <= 30))
    );

    const sessionLabel = isTradingHours ? "Today" : "Tomorrow / Next Session";
    const marketStatus = isTradingHours ? "Open" : "Closed";

    const result = {
        scan_type: type,
        signals: unique,
        count: unique.length,
        universe: universe.length,
        scanned_at: new Date().toISOString(),
        market_status: marketStatus,
        session_target: sessionLabel,
        market_note: `Calculated using latest EOD/Live data. Signals for ${sessionLabel}.`,
    };

    cache.set(cacheKey, { t: Date.now(), d: result });
    return NextResponse.json(result, {
        headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
    });
}
