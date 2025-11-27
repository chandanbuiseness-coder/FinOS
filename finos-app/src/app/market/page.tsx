"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketTable, MarketItem } from "@/components/market/MarketTable";
import { Loader2 } from "lucide-react";

export default function MarketPage() {
    const [data, setData] = useState<{ items: MarketItem[], status: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_TENALI_API_URL || '/api/py';
                const res = await fetch(`${API_URL}/market`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch market data", error);
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

    const indices = data?.items.filter(i => i.type === 'INDEX') || [];
    const crypto = data?.items.filter(i => i.type === 'CRYPTO') || [];
    const forex = data?.items.filter(i => i.type === 'FOREX') || [];

    return (
        <div className="p-6 text-white h-full overflow-y-auto">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Market Overview</h2>
                    <p className="text-gray-400">Real-time global market data.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${data?.status === 'Market Open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {data?.status || 'Unknown'}
                    </span>
                </div>
            </div>

            <Tabs defaultValue="indices" className="w-full">
                <TabsList className="bg-gray-900 border border-gray-800">
                    <TabsTrigger value="indices">Indices</TabsTrigger>
                    <TabsTrigger value="crypto">Crypto</TabsTrigger>
                    <TabsTrigger value="forex">Forex</TabsTrigger>
                </TabsList>
                <TabsContent value="indices" className="mt-4">
                    <MarketTable items={indices} />
                </TabsContent>
                <TabsContent value="crypto" className="mt-4">
                    <MarketTable items={crypto} />
                </TabsContent>
                <TabsContent value="forex" className="mt-4">
                    <MarketTable items={forex} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
