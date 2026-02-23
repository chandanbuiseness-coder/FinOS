"use client";
import React from "react";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    TrendingUp, TrendingDown, Minus, RefreshCw, Loader2,
    Target, ShieldAlert, Zap, BarChart2, Clock, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Smart URL: if env var is a localhost URL but we're on a real domain (Vercel/prod),
// fall back to the relative /api/py path so the call hits the Vercel serverless function.
function getApiBase(): string {
    const raw = process.env.NEXT_PUBLIC_TENALI_API_URL || "/api/py";
    if (typeof window !== "undefined" && raw.includes("localhost") && !window.location.hostname.includes("localhost")) {
        return "/api/py";
    }
    return raw;
}

type ScanType = "intraday" | "swing" | "longterm";

interface Signal {
    symbol: string;
    algorithm: string;
    algo_type: string;
    signal: "BUY" | "SELL" | "SHORT" | "ACCUMULATE";
    entry: number;
    stop_loss: number;
    target_1: number;
    target_2: number;
    confidence: number;
    timeframe: string;
    detail: string;
    risk_reward: string;
    tags: string[];
}

interface ScanResult {
    scan_type: string;
    signals: Signal[];
    count: number;
    universe: number;
    scanned_at: string;
    market_note: string;
}

const SIGNAL_STYLE: Record<string, string> = {
    BUY: "bg-green-500/20 text-green-400 border-green-600/40",
    SELL: "bg-red-500/20 text-red-400 border-red-600/40",
    SHORT: "bg-orange-500/20 text-orange-400 border-orange-600/40",
    ACCUMULATE: "bg-blue-500/20 text-blue-400 border-blue-600/40",
};

const SIGNAL_ICON: Record<string, React.ReactNode> = {
    BUY: <TrendingUp className="h-4 w-4" />,
    SELL: <TrendingDown className="h-4 w-4" />,
    SHORT: <TrendingDown className="h-4 w-4" />,
    ACCUMULATE: <Minus className="h-4 w-4" />,
};

function ConfBar({ value }: { value: number }) {
    const color = value >= 80 ? "bg-green-500" : value >= 65 ? "bg-yellow-500" : "bg-orange-500";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-700">
                <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{value}%</span>
        </div>
    );
}

function SignalCard({ s, onAskTenali }: { s: Signal; onAskTenali: (s: Signal) => void }) {
    const isLong = s.signal === "BUY" || s.signal === "ACCUMULATE";
    return (
        <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all group">
            <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-white">{s.symbol}</span>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${SIGNAL_STYLE[s.signal]}`}>
                                <span className="mr-1">{SIGNAL_ICON[s.signal]}</span>
                                {s.signal}
                            </Badge>
                        </div>
                        <p className="text-xs text-indigo-400 font-medium">{s.algorithm}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">Confidence</p>
                        <p className={`text-lg font-bold ${s.confidence >= 80 ? "text-green-400" : s.confidence >= 65 ? "text-yellow-400" : "text-orange-400"}`}>
                            {s.confidence}%
                        </p>
                    </div>
                </div>
                <ConfBar value={s.confidence} />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
                {/* Entry / SL / Targets */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                        { label: "Entry", value: s.entry, color: "text-blue-400" },
                        { label: "Stop", value: s.stop_loss, color: "text-red-400" },
                        { label: "T1", value: s.target_1, color: "text-green-400" },
                        { label: "T2", value: s.target_2, color: "text-emerald-400" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-800/60 rounded-lg py-2 px-1">
                            <p className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</p>
                            <p className={`text-xs font-bold ${color}`}>₹{value.toLocaleString("en-IN")}</p>
                        </div>
                    ))}
                </div>

                {/* Detail */}
                <p className="text-xs text-gray-400 leading-relaxed">{s.detail}</p>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="h-3 w-3" />{s.timeframe}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Target className="h-3 w-3" />RR {s.risk_reward}
                        </span>
                        {s.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                                {t}
                            </span>
                        ))}
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAskTenali(s)}
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 text-xs h-7 px-2 gap-1"
                    >
                        Ask Tenali <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

const TABS: { id: ScanType; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    { id: "intraday", label: "Intraday", icon: <Zap className="h-4 w-4" />, desc: "ORB + Supertrend signals for today", color: "text-orange-400 border-orange-600/50 bg-orange-900/20" },
    { id: "swing", label: "Swing", icon: <TrendingUp className="h-4 w-4" />, desc: "2-6 week momentum & breakout setups", color: "text-blue-400 border-blue-600/50 bg-blue-900/20" },
    { id: "longterm", label: "Long-Term", icon: <BarChart2 className="h-4 w-4" />, desc: "Quality value picks for 3–12 months", color: "text-green-400 border-green-600/50 bg-green-900/20" },
];

export default function TradesPage() {
    const router = useRouter();
    const [tab, setTab] = useState<ScanType>("swing");
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const runScan = useCallback(async (type: ScanType) => {
        setLoading(true);
        setError("");
        setResult(null);
        const controller = new AbortController();
        // 55s timeout — gives Vercel serverless enough time for a cold-start scan
        const tid = setTimeout(() => controller.abort(), 55_000);
        try {
            const api = getApiBase();
            const res = await fetch(`${api}/scanner?type=${type}`, { signal: controller.signal });
            clearTimeout(tid);
            if (!res.ok) {
                const detail = await res.text().catch(() => "");
                throw new Error(`Server error ${res.status}${detail ? `: ${detail}` : ""}`);
            }
            const data = await res.json();
            setResult(data);
        } catch (e: any) {
            clearTimeout(tid);
            if (e.name === "AbortError") {
                setError("Scan timed out after 55s. The server is processing a large universe — please try again, subsequent runs are faster.");
            } else {
                setError(e.message || "Failed to run scan.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { runScan(tab); }, [tab, runScan]);

    const handleAskTenali = (s: Signal) => {
        const msg = `Analyse this ${s.signal} setup for ${s.symbol}: entry ₹${s.entry}, SL ₹${s.stop_loss}, T1 ₹${s.target_1}. Algorithm: ${s.algorithm}. ${s.detail}`;
        router.push(`/chat?q=${encodeURIComponent(msg)}`);
    };

    const activeTab = TABS.find((t) => t.id === tab)!;

    return (
        <div className="p-6 space-y-5 text-white h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <BarChart2 className="h-8 w-8 text-indigo-400" /> Trade Scanner
                    </h1>
                    <p className="text-gray-400 mt-1">AI-powered algorithm suite for Nifty 50 universe</p>
                </div>
                <Button
                    onClick={() => runScan(tab)}
                    disabled={loading}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:border-indigo-600 hover:text-indigo-400"
                >
                    {loading
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning…</>
                        : <><RefreshCw className="h-4 w-4 mr-2" />Refresh</>
                    }
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-3">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${tab === t.id ? t.color : "border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300"}`}
                    >
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* Active tab description */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{activeTab.desc}</p>
                {result && (
                    <p className="text-xs text-gray-500">
                        {result.count} signal{result.count !== 1 ? "s" : ""} from {result.universe} stocks
                        <span className="ml-2 text-gray-600">
                            · {new Date(result.scanned_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </p>
                )}
            </div>

            {/* State: loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                    <p className="text-gray-400">Running algorithms on Nifty 500…</p>
                    <p className="text-xs text-gray-600">First run fetches live data for 200 stocks — takes ~30–50s. Subsequent runs are instant (cached).</p>
                </div>
            )}

            {/* State: error */}
            {!loading && error && (
                <Card className="border-red-900/40 bg-red-950/10">
                    <CardContent className="pt-6 flex items-start gap-3">
                        <ShieldAlert className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="text-red-400 font-medium">Scan Failed</p>
                            <p className="text-gray-400 text-sm">{error}</p>
                            <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-800">
                                <p className="font-medium text-gray-400">Troubleshooting:</p>
                                <p>• <span className="text-indigo-400">On Vercel</span>: Do NOT set <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_TENALI_API_URL</code> in environment variables — leave it blank so it auto-routes to <code className="bg-gray-800 px-1 rounded">/api/py</code>.</p>
                                <p>• <span className="text-indigo-400">Local dev</span>: Ensure the backend is running on port 8000: <code className="bg-gray-800 px-1 rounded">python -m uvicorn api.index:app --reload --port 8000</code></p>
                                <p>• First scan takes ~30–50s on cold start. Click <strong>Refresh</strong> to retry.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* State: no signals */}
            {!loading && !error && result && result.count === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <BarChart2 className="h-12 w-12 text-gray-700" />
                    <p className="text-gray-400 font-medium">No signals found right now</p>
                    <p className="text-gray-600 text-sm max-w-md">
                        {tab === "intraday"
                            ? "Intraday signals fire during market hours (9:15 AM–3:30 PM IST). Try Swing or Long-Term scans for EOD-based setups."
                            : "No qualifying setups in the Nifty 50 universe today. Markets may be in a consolidation phase."}
                    </p>
                </div>
            )}

            {/* Signals grid */}
            {!loading && !error && result && result.count > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {result.signals.map((s, i) => (
                        <SignalCard key={`${s.symbol}-${i}`} s={s} onAskTenali={handleAskTenali} />
                    ))}
                </div>
            )}

            {/* Disclaimer */}
            {result && result.count > 0 && (
                <p className="text-xs text-gray-600 text-center pb-4">
                    ⚠️ For educational purposes only — not investment advice. Always do your own research. {result.market_note}
                </p>
            )}
        </div>
    );
}
