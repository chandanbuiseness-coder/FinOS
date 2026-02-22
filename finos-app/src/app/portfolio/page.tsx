"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { AssetList } from "@/components/dashboard/AssetList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// 12 distinct colors for pie slices
const COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
    "#f97316", "#a855f7", "#06b6d4", "#84cc16",
];

function fmt(n: number) {
    if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
    if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function PortfolioPage() {
    const { assets, totalValue, totalInvestment, totalReturn, totalReturnPercent, isLoading } = usePortfolio();

    // Pie chart data
    const pieData = assets
        .filter((a) => (a.currentPrice ?? a.avgPrice) * a.quantity > 0)
        .map((a) => ({
            name: a.symbol.replace(".NS", "").replace(".BO", ""),
            value: (a.currentPrice ?? a.avgPrice) * a.quantity,
            fullName: a.name,
        }))
        .sort((x, y) => y.value - x.value);

    // Top gainers / losers
    const sorted = [...assets].sort(
        (a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)
    );
    const topGainer = sorted[0];
    const topLoser = sorted[sorted.length - 1];

    const isPositive = totalReturn >= 0;

    return (
        <div className="p-6 space-y-6 text-white h-full overflow-y-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
                <p className="text-gray-400 mt-1">Holdings, allocation, and performance analysis</p>
            </div>

            {/* KPI Cards */}
            <PortfolioSummary />

            {/* Allocation Pie + Quick Stats */}
            {assets.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Allocation Pie Chart */}
                    <Card className="bg-gray-900 border-gray-800 text-white">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-100">Portfolio Allocation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="h-64 flex items-center justify-center text-gray-500">Loading…</div>
                            ) : pieData.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-gray-500">No data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={95}
                                            innerRadius={50}
                                            paddingAngle={2}
                                            label={({ name, percent }) =>
                                                (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
                                            }
                                            labelLine={false}
                                        >
                                            {pieData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                                            formatter={(v: number) => [fmt(v), "Value"]}
                                        />
                                        <Legend
                                            formatter={(name) => <span style={{ color: "#9ca3af", fontSize: "12px" }}>{name}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Performance Stats */}
                    <div className="space-y-4">
                        {/* Overall P&L Card */}
                        <Card className={`border ${isPositive ? "border-green-900/50 bg-green-950/20" : "border-red-900/50 bg-red-950/20"} text-white`}>
                            <CardContent className="pt-5">
                                <div className="flex items-center gap-3">
                                    {isPositive
                                        ? <TrendingUp className="h-8 w-8 text-green-400" />
                                        : <TrendingDown className="h-8 w-8 text-red-400" />
                                    }
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Overall P&L</p>
                                        <p className={`text-2xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                            {isPositive ? "+" : ""}{fmt(totalReturn)}
                                        </p>
                                        <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                            {isPositive ? "▲" : "▼"} {Math.abs(totalReturnPercent).toFixed(2)}% on {fmt(totalInvestment)} invested
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Gainer */}
                        {topGainer && (topGainer.changePercent ?? 0) !== 0 && (
                            <Card className="bg-gray-900 border-gray-800 text-white">
                                <CardContent className="pt-4 pb-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Best Today</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{topGainer.symbol.replace(".NS", "")}</p>
                                            <p className="text-xs text-gray-500">{topGainer.name}</p>
                                        </div>
                                        <p className="text-green-400 font-bold">
                                            +{(topGainer.changePercent ?? 0).toFixed(2)}%
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top Loser */}
                        {topLoser && (topLoser.changePercent ?? 0) !== 0 && topLoser.symbol !== topGainer?.symbol && (
                            <Card className="bg-gray-900 border-gray-800 text-white">
                                <CardContent className="pt-4 pb-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Lagging Today</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{topLoser.symbol.replace(".NS", "")}</p>
                                            <p className="text-xs text-gray-500">{topLoser.name}</p>
                                        </div>
                                        <p className="text-red-400 font-bold">
                                            {(topLoser.changePercent ?? 0).toFixed(2)}%
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Holdings Count */}
                        <Card className="bg-gray-900 border-gray-800 text-white">
                            <CardContent className="pt-4 pb-4 flex items-center gap-4">
                                <Minus className="h-6 w-6 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Holdings</p>
                                    <p className="text-xl font-bold text-white">{assets.length} <span className="text-sm text-gray-400">positions</span></p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Holdings Table */}
            <AssetList />
        </div>
    );
}
