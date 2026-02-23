import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface MarketItem {
    symbol: string;
    name: string;
    price: number | string;
    change: number | string;
    changePercent: number | string;
    volume: number | string;
    type?: string;
    status?: string;
    icon?: React.ReactNode;
}

interface MarketTableProps {
    items: MarketItem[];
    showStatus?: boolean;
}

export function MarketTable({ items, showStatus = false }: MarketTableProps) {
    // Helper to safely format numbers
    const formatValue = (val: number | string, decimals = 2) => {
        if (typeof val === "number") return val.toFixed(decimals);
        const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? val : n.toFixed(decimals);
    };

    // Helper to check if positive
    const isPositive = (val: number | string) => {
        if (typeof val === "number") return val >= 0;
        return !String(val).startsWith("-");
    };

    return (
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm overflow-hidden text-white shadow-2xl">
            <Table>
                <TableHeader className="bg-gray-800/30">
                    <TableRow className="border-gray-800/60 hover:bg-transparent">
                        <TableHead className="text-gray-400 font-medium py-4">Instrument</TableHead>
                        <TableHead className="text-right text-gray-400 font-medium py-4">Price</TableHead>
                        <TableHead className="text-right text-gray-400 font-medium py-4">Change</TableHead>
                        <TableHead className="text-right text-gray-400 font-medium py-4">24h %</TableHead>
                        <TableHead className="text-right text-gray-400 font-medium py-4">Market Cap / Vol</TableHead>
                        {showStatus && <TableHead className="text-right text-gray-400 font-medium py-4">Status</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.symbol} className="border-gray-800/40 hover:bg-gray-800/20 transition-colors group cursor-default">
                            <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gray-800 group-hover:bg-gray-700 transition-colors">
                                        {item.icon || <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-bold">{item.symbol[0]}</div>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">
                                            {item.symbol.replace(".NS", "").replace("^", "")}
                                        </div>
                                        <div className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">{item.name}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                                {typeof item.price === "number" ? item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : item.price}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${isPositive(item.change) ? "text-green-400" : "text-red-400"}`}>
                                <span className="text-[10px] mr-1 opacity-60 font-sans">{isPositive(item.change) ? "▲" : "▼"}</span>
                                {formatValue(item.change)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge
                                    variant="outline"
                                    className={`font-mono border-0 rounded-lg px-2 py-1 ${isPositive(item.changePercent) ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                                >
                                    {isPositive(item.changePercent) ? "+" : ""}{formatValue(item.changePercent)}%
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-gray-400 text-sm font-medium">
                                {item.volume || "-"}
                            </TableCell>
                            {showStatus && (
                                <TableCell className="text-right">
                                    <div className="flex justify-end">
                                        <div className={`h-1.5 w-1.5 rounded-full ${item.status === "Open" ? "bg-green-500 animate-pulse" : "bg-red-500"} mr-2 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.5)]`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${item.status === "Open" ? "text-green-400" : "text-red-400"}`}>
                                            {item.status || "Closed"}
                                        </span>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
