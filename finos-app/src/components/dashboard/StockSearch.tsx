"use client";

import { useState } from 'react';
import { Search, Plus, TrendingUp, BarChart2, MessageSquare, X, Check, RefreshCw } from 'lucide-react';
import { fetchRealTimeQuote } from '@/lib/api/marketData';
import { AnalysisModal } from './AnalysisModal';
import { usePortfolio } from "@/context/PortfolioContext";
import { Badge } from "@/components/ui/badge";

export function StockSearch() {
    const { addToWatchlist } = usePortfolio();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisPrompt, setAnalysisPrompt] = useState('');
    const [addedMessage, setAddedMessage] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);
        setAddedMessage('');

        try {
            const data = await fetchRealTimeQuote(query);
            setResult(data);
        } catch (err) {
            setError(`Stock not found. Try using the ticker symbol (e.g., "INFY" for Infosys, "HDFCBANK" for HDFC Bank)`);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResult(null);
        setError('');
        setAddedMessage('');
    };

    const handleAddToWatchlist = () => {
        if (result) {
            addToWatchlist(result.symbol);
            setAddedMessage('Added to Watchlist!');
            setTimeout(() => setAddedMessage(''), 3000);
        }
    };

    const handleAnalyze = () => {
        if (result) {
            setAnalysisPrompt(`Analyze ${result.symbol}`);
            setShowAnalysis(true);
        }
    };

    const handleViewChart = () => {
        if (result) {
            // Redirect to TradingView
            const symbol = result.symbol.replace('.NS', '');
            window.open(`https://in.tradingview.com/chart/?symbol=NSE:${symbol}`, '_blank');
        }
    };

    return (
        <>
            <AnalysisModal
                isOpen={showAnalysis}
                onClose={() => setShowAnalysis(false)}
                title={`Stock Analysis: ${result?.symbol || ''}`}
                prompt={analysisPrompt}
            />

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search stock (e.g., RELIANCE, TCS)..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 w-full md:w-auto"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {error && <div className="text-red-400 text-sm">{error}</div>}

                {result && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-white">{result.symbol}</h3>
                                    {result.source === "AI_ESTIMATE" && (
                                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 text-[10px] bg-yellow-500/10">
                                            AI Estimate
                                        </Badge>
                                    )}
                                    <button
                                        onClick={() => handleSearch({ preventDefault: () => { } } as any)}
                                        className="ml-2 p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                                        title="Refresh Data"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl font-bold text-white">
                                        ₹{result.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className={`text-sm font-medium ${result.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.change >= 0 ? '+' : ''}{result.change.toFixed(2)} ({result.change_percent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={handleAddToWatchlist}
                                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    title="Add to Watchlist"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                                {addedMessage && (
                                    <span className="text-xs text-green-400 flex items-center animate-in fade-in slide-in-from-right-5">
                                        <Check className="h-3 w-3 mr-1" />
                                        {addedMessage}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div>
                                <div className="text-gray-400">Day High</div>
                                <div className="text-white">₹{result.day_high.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-400">Day Low</div>
                                <div className="text-white">₹{result.day_low.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-400">Volume</div>
                                <div className="text-white">{result.volume.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-400">Prev Close</div>
                                <div className="text-white">₹{result.previous_close.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-gray-700">
                            <button
                                onClick={handleViewChart}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                <BarChart2 className="h-4 w-4" />
                                View Chart
                            </button>
                            <button
                                onClick={handleAnalyze}
                                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Analyze with Tenali
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
