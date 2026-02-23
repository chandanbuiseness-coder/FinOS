"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketTable, MarketItem } from "@/components/market/MarketTable";
import { Loader2 } from "lucide-react";
import {
    fetchIndices,
    fetchMultipleCryptos,
    fetchForexRate,
} from "@/lib/api/marketData";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketTable, MarketItem } from "@/components/market/MarketTable";
import { Loader2, TrendingUp, TrendingDown, Globe, Coins, Landmark, ArrowRight, Activity, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    fetchIndices,
    fetchMultipleCryptos,
    fetchForexRate,
} from "@/lib/api/marketData";

const INDEX_MAP: Record<string, { name: string; icon: string }> = {
    "^NSEI": { name: "NIFTY 50", icon: "🇮🇳" },
    "^NSEBANK": { name: "BANK NIFTY", icon: "🏦" },
    "^BSESN": { name: "SENSEX", icon: "🏛️" },
    "^CNXIT": { name: "NIFTY IT", icon: "💻" },
};

const CRYPTO_ICONS: Record<string, string> = {
    BTC: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    ADA: "https://cryptologos.cc/logos/cardano-ada-logo.png",
    SOL: "https://cryptologos.cc/logos/solana-sol-logo.png",
    XRP: "https://cryptologos.cc/logos/xrp-xrp-logo.png",
};

export default function MarketPage() {
    const [indices, setIndices] = useState<MarketItem[]>([]);
    const [crypto, setCrypto] = useState<MarketItem[]>([]);
    const [forex, setForex] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [indicesData, cryptoData, forexData] = await Promise.all([
                    fetchIndices(),
                    fetchMultipleCryptos(["bitcoin", "ethereum", "cardano", "solana", "ripple"]),
                    Promise.all([
                        fetchForexRate("USD", "INR"),
                        fetchForexRate("EUR", "USD"),
                        fetchForexRate("GBP", "USD"),
                        fetchForexRate("USD", "JPY"),
                    ]),
                ]);

                const mappedIndices: MarketItem[] = indicesData.map((item: any) => ({
                    symbol: INDEX_MAP[item.symbol]?.name || item.symbol.replace("^", ""),
                    name: item.name,
                    price: item.price,
                    change: item.change,
                    changePercent: parseFloat(item.changePercent) || item.change,
                    volume: "-",
                    type: "INDEX",
                    status: "Open",
                    icon: <span className="text-xl">{INDEX_MAP[item.symbol]?.icon || "📈"}</span>,
                }));

                const cryptoNames: Record<string, string> = {
                    BTC: "Bitcoin",
                    ETH: "Ethereum",
                    ADA: "Cardano",
                    SOL: "Solana",
                    XRP: "Ripple",
                };
                const mappedCrypto: MarketItem[] = cryptoData.map((item: any) => ({
                    symbol: item.symbol,
                    name: cryptoNames[item.symbol] || item.symbol,
                    price: `$${item.priceUSD?.toLocaleString() ?? "N/A"}`,
                    change: item.change24h ?? 0,
                    changePercent: item.change24h ?? 0,
                    volume: item.volume24h ? `$${(item.volume24h / 1e9).toFixed(2)}B` : "-",
                    type: "CRYPTO",
                    status: "Open",
                    icon: CRYPTO_ICONS[item.symbol] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={CRYPTO_ICONS[item.symbol]} alt={item.symbol} className="h-5 w-5 object-contain" />
                    ) : null,
                }));

                const forexNames: Record<string, string> = {
                    "USD/INR": "US Dollar / INR",
                    "EUR/USD": "Euro / US Dollar",
                    "GBP/USD": "British Pound / USD",
                    "USD/JPY": "US Dollar / Yen",
                };
                const mappedForex: MarketItem[] = forexData.map((item: any) => {
                    const pair = `${item.from}/${item.to}`;
                    return {
                        symbol: pair,
                        name: forexNames[pair] || pair,
                        price: item.rate,
                        change: 0,
                        changePercent: 0,
                        volume: "-",
                        type: "FOREX",
                        status: "Open",
                        icon: <Globe className="h-5 w-5 text-blue-400" />,
                    };
                });

                setIndices(mappedIndices);
                setCrypto(mappedCrypto);
                setForex(mappedForex);
            } catch (error) {
                console.error("Failed to fetch market data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <p className="text-gray-400 font-medium animate-pulse">Fetching global markets...</p>
            </div>
        );
    }

    const n50 = indices.find((index) => index.symbol === "NIFTY 50");
    const bn = indices.find((index) => index.symbol === "BANK NIFTY");

    return (
        <div className="p-6 text-white h-full overflow-y-auto space-y-8 scrollbar-hide">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Market Pulse
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" /> Live coverage across Equity, Crypto & Forex
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-gray-900 border-gray-800 text-gray-400 px-3 py-1">
                        UTC: {new Date().toISOString().slice(11, 16)}
                    </Badge>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Live</span>
                </div>
            </div>

            {/* Quick Index Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {indices.map((idx) => (
                    <Card key={idx.symbol} className="bg-gray-900/40 border-gray-800/60 backdrop-blur-md hover:bg-gray-800/40 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            {idx.icon}
                        </div>
                        <CardContent className="p-5">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{idx.symbol}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl font-bold text-white tabular-nums">
                                    {(idx.price as number).toLocaleString("en-IN")}
                                </h3>
                                <div className={`flex items-center text-[11px] font-bold ${idx.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent}%
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">Status: {idx.status}</span>
                                <ArrowRight className="h-3 w-3 text-gray-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Tabs */}
            <div className="space-y-4">
                <Tabs defaultValue="indices" className="w-full">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                        <TabsList className="bg-transparent border-0 p-0 h-auto gap-6">
                            <TabsTrigger value="indices" className="bg-transparent border-0 p-0 h-auto text-gray-500 data-[state=active]:text-indigo-400 data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-[-9px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-indigo-400 relative pb-2 transition-all font-bold">
                                Equity Indices
                            </TabsTrigger>
                            <TabsTrigger value="crypto" className="bg-transparent border-0 p-0 h-auto text-gray-500 data-[state=active]:text-indigo-400 data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-[-9px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-indigo-400 relative pb-2 transition-all font-bold">
                                Cryptocurrencies
                            </TabsTrigger>
                            <TabsTrigger value="forex" className="bg-transparent border-0 p-0 h-auto text-gray-500 data-[state=active]:text-indigo-400 data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-[-9px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-indigo-400 relative pb-2 transition-all font-bold">
                                Forex
                            </TabsTrigger>
                        </TabsList>
                        <div className="hidden sm:flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                <Wallet className="h-3 w-3" /> Auto-sync enabled
                            </div>
                        </div>
                    </div>

                    <TabsContent value="indices" className="mt-0">
                        <MarketTable items={indices} showStatus />
                    </TabsContent>
                    <TabsContent value="crypto" className="mt-0">
                        <MarketTable items={crypto} />
                    </TabsContent>
                    <TabsContent value="forex" className="mt-0">
                        <MarketTable items={forex} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Market Footer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-800/40">
                <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-indigo-400" />
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Global Connect</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Direct feeds from Yahoo Finance v8 API. Supporting NSE, BSE, LSE and major global exchanges.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-indigo-400" />
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Smart Latency</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Data is auto-refreshed every 60 seconds. Intraday signals are optimized for 15-minute intervals.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <Landmark className="h-5 w-5 text-indigo-400" />
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Institutional Grade</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Clean, noise-filtered data suitable for both swing analysis and long-term portfolio management.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
