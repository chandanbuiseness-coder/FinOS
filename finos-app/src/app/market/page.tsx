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

export default function MarketPage() {
    const [indices, setIndices] = useState<MarketItem[]>([]);
    const [crypto, setCrypto] = useState<MarketItem[]>([]);
    const [forex, setForex] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all data in parallel using the existing marketData.ts library
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

                // Map indices to MarketItem shape
                const mappedIndices: MarketItem[] = indicesData.map((item: any) => ({
                    symbol: item.symbol,
                    name: item.name,
                    price: item.price,
                    change: item.change,
                    changePercent: parseFloat(item.changePercent) || item.change,
                    volume: "-",
                    type: "INDEX",
                    status: "Open",
                }));

                // Map crypto to MarketItem shape
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
                    volume: item.volume24h
                        ? `$${(item.volume24h / 1e9).toFixed(2)}B`
                        : "-",
                    type: "CRYPTO",
                    status: "Open",
                }));

                // Map forex to MarketItem shape
                const forexNames: Record<string, string> = {
                    "USD/INR": "US Dollar / Indian Rupee",
                    "EUR/USD": "Euro / US Dollar",
                    "GBP/USD": "British Pound / US Dollar",
                    "USD/JPY": "US Dollar / Japanese Yen",
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
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 text-white h-full overflow-y-auto">
            <div className="mb-6">
                <h2 className="text-3xl font-bold">Market Overview</h2>
                <p className="text-gray-400">Real-time global market data.</p>
            </div>

            <Tabs defaultValue="indices" className="w-full">
                <TabsList className="bg-gray-900 border border-gray-800">
                    <TabsTrigger value="indices">Indices</TabsTrigger>
                    <TabsTrigger value="crypto">Crypto</TabsTrigger>
                    <TabsTrigger value="forex">Forex</TabsTrigger>
                </TabsList>
                <TabsContent value="indices" className="mt-4">
                    <MarketTable items={indices} showStatus />
                </TabsContent>
                <TabsContent value="crypto" className="mt-4">
                    <MarketTable items={crypto} showStatus />
                </TabsContent>
                <TabsContent value="forex" className="mt-4">
                    <MarketTable items={forex} showStatus />
                </TabsContent>
            </Tabs>
        </div>
    );
}
