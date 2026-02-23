"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRealTimeQuote } from "@/lib/api/marketData";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Asset {
    symbol: string;
    name: string;
    quantity: number;
    avgPrice: number;
    currentPrice?: number;
    value?: number;
    change?: number;
    changePercent?: number;
}

export interface WatchlistItem {
    symbol: string;
    name: string;
    price?: number;
    change?: number;
    changePercent?: number;
}

interface PortfolioContextType {
    assets: Asset[];
    watchlist: WatchlistItem[];
    isLoading: boolean;
    addAsset: (asset: Asset) => Promise<void>;
    removeAsset: (symbol: string) => Promise<void>;
    addToWatchlist: (symbol: string) => Promise<void>;
    removeFromWatchlist: (symbol: string) => Promise<void>;
    refreshData: () => Promise<void>;
    totalValue: number;
    totalInvestment: number;
    totalReturn: number;
    totalReturnPercent: number;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// ── Helper: fetch live price ──────────────────────────────────────────────────
async function enrichWithPrice<T extends { symbol: string }>(
    items: T[]
): Promise<(T & { price?: number; change?: number; changePercent?: number; currentPrice?: number; value?: number })[]> {
    return Promise.all(
        items.map(async (item) => {
            try {
                const q = await fetchRealTimeQuote(item.symbol);
                const isAsset = "quantity" in item;
                const qty = isAsset ? (item as any).quantity ?? 0 : 0;
                return {
                    ...item,
                    currentPrice: q.price,
                    price: q.price,
                    value: isAsset ? q.price * qty : undefined,
                    change: q.change,
                    changePercent: q.change_percent,
                };
            } catch {
                return item;
            }
        })
    );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Derived totals
    const [totalValue, setTotalValue] = useState(0);
    const [totalInvestment, setTotalInvestment] = useState(0);
    const [totalReturn, setTotalReturn] = useState(0);
    const [totalReturnPercent, setTotalReturnPercent] = useState(0);

    // Re-compute totals whenever assets change
    useEffect(() => {
        let invest = 0, value = 0;
        assets.forEach((a) => {
            invest += a.quantity * a.avgPrice;
            value += (a.currentPrice ?? a.avgPrice) * a.quantity;
        });
        setTotalInvestment(invest);
        setTotalValue(value);
        setTotalReturn(value - invest);
        setTotalReturnPercent(invest > 0 ? ((value - invest) / invest) * 100 : 0);
    }, [assets]);

    // ── Load from Supabase (with localStorage migration) ─────────────────────
    const loadFromSupabase = useCallback(async (uid: string) => {
        setIsLoading(true);
        try {
            // ── 1. Migrate legacy localStorage if data exists ────────────────
            const lsFinosAssets = localStorage.getItem("finos_assets");
            const lsFinosWatchlist = localStorage.getItem("finos_watchlist");
            const lsQuantraAssets = localStorage.getItem("quantra_assets");
            const lsQuantraWatchlist = localStorage.getItem("quantra_watchlist");

            if (lsFinosAssets || lsQuantraAssets) {
                try {
                    const raw = lsQuantraAssets || lsFinosAssets;
                    const parsed: Asset[] = JSON.parse(raw!);
                    if (parsed.length > 0) {
                        const rows = parsed.map((a) => ({
                            user_id: uid,
                            symbol: a.symbol,
                            name: a.name,
                            quantity: a.quantity,
                            avg_price: a.avgPrice,
                        }));
                        await supabase.from("user_portfolio").upsert(rows, { onConflict: "user_id,symbol" });
                        localStorage.removeItem("finos_assets");
                        localStorage.removeItem("quantra_assets");
                        console.log("[Quantra] Migrated portfolio to Supabase");
                    }
                } catch { }
            }

            if (lsFinosWatchlist || lsQuantraWatchlist) {
                try {
                    const raw = lsQuantraWatchlist || lsFinosWatchlist;
                    const parsed: WatchlistItem[] = JSON.parse(raw!);
                    if (parsed.length > 0) {
                        const rows = parsed.map((w) => ({ user_id: uid, symbol: w.symbol }));
                        await supabase.from("user_watchlist").upsert(rows, { onConflict: "user_id,symbol" });
                        localStorage.removeItem("finos_watchlist");
                        localStorage.removeItem("quantra_watchlist");
                        console.log("[Quantra] Migrated watchlist to Supabase");
                    }
                } catch { }
            }

            // ── 2. Load from Supabase ─────────────────────────────────────────
            const [{ data: portfolioRows }, { data: watchlistRows }] = await Promise.all([
                supabase.from("user_portfolio").select("*").eq("user_id", uid).order("created_at"),
                supabase.from("user_watchlist").select("*").eq("user_id", uid).order("added_at"),
            ]);

            const rawAssets: Asset[] = (portfolioRows ?? []).map((row) => ({
                symbol: row.symbol,
                name: row.name,
                quantity: Number(row.quantity),
                avgPrice: Number(row.avg_price),
            }));

            const rawWatchlist: WatchlistItem[] = (watchlistRows ?? []).map((row) => ({
                symbol: row.symbol,
                name: row.symbol,
            }));

            // ── 3. Enrich with live prices ────────────────────────────────────
            const [enrichedAssets, enrichedWatchlist] = await Promise.all([
                enrichWithPrice(rawAssets),
                enrichWithPrice(rawWatchlist),
            ]);

            setAssets(enrichedAssets as Asset[]);
            setWatchlist(enrichedWatchlist as WatchlistItem[]);
        } catch (err) {
            console.error("[Quantra] Error loading portfolio:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // ── Auth listener + initial load ──────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadFromSupabase(user.id);
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const uid = session?.user?.id ?? null;
            setUserId(uid);
            if (uid) {
                loadFromSupabase(uid);
            } else {
                setAssets([]);
                setWatchlist([]);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadFromSupabase, supabase]);

    // ── Auto-refresh prices every 60 seconds ──────────────────────────────────
    useEffect(() => {
        const interval = setInterval(async () => {
            if (assets.length === 0 && watchlist.length === 0) return;
            const [ea, ew] = await Promise.all([
                enrichWithPrice(assets),
                enrichWithPrice(watchlist),
            ]);
            setAssets(ea as Asset[]);
            setWatchlist(ew as WatchlistItem[]);
        }, 60_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assets.length, watchlist.length]);

    // ── Public refresh ────────────────────────────────────────────────────────
    const refreshData = useCallback(async () => {
        if (!userId) return;
        await loadFromSupabase(userId);
    }, [userId, loadFromSupabase]);

    // ── Add Asset ─────────────────────────────────────────────────────────────
    const addAsset = useCallback(async (newAsset: Asset) => {
        if (!userId) return;
        const { error } = await supabase.from("user_portfolio").upsert(
            {
                user_id: userId,
                symbol: newAsset.symbol,
                name: newAsset.name,
                quantity: newAsset.quantity,
                avg_price: newAsset.avgPrice,
            },
            { onConflict: "user_id,symbol" }
        );
        if (!error) {
            const enriched = await enrichWithPrice([newAsset]);
            setAssets((prev) => {
                const without = prev.filter((a) => a.symbol !== newAsset.symbol);
                return [...without, enriched[0] as Asset];
            });
        }
    }, [userId, supabase]);

    // ── Remove Asset ──────────────────────────────────────────────────────────
    const removeAsset = useCallback(async (symbol: string) => {
        if (!userId) return;
        await supabase.from("user_portfolio").delete().eq("user_id", userId).eq("symbol", symbol);
        setAssets((prev) => prev.filter((a) => a.symbol !== symbol));
    }, [userId, supabase]);

    // ── Add to Watchlist ──────────────────────────────────────────────────────
    const addToWatchlist = useCallback(async (symbol: string) => {
        if (!userId) return;
        if (watchlist.find((w) => w.symbol === symbol)) return;
        const { error } = await supabase.from("user_watchlist").upsert(
            { user_id: userId, symbol },
            { onConflict: "user_id,symbol" }
        );
        if (!error) {
            const newItem: WatchlistItem = { symbol, name: symbol };
            const enriched = await enrichWithPrice([newItem]);
            setWatchlist((prev) => [...prev, enriched[0] as WatchlistItem]);
        }
    }, [userId, watchlist, supabase]);

    // ── Remove from Watchlist ─────────────────────────────────────────────────
    const removeFromWatchlist = useCallback(async (symbol: string) => {
        if (!userId) return;
        await supabase.from("user_watchlist").delete().eq("user_id", userId).eq("symbol", symbol);
        setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
    }, [userId, supabase]);

    return (
        <PortfolioContext.Provider
            value={{
                assets,
                watchlist,
                isLoading,
                addAsset,
                removeAsset,
                addToWatchlist,
                removeFromWatchlist,
                refreshData,
                totalValue,
                totalInvestment,
                totalReturn,
                totalReturnPercent,
            }}
        >
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const ctx = useContext(PortfolioContext);
    if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
    return ctx;
}
