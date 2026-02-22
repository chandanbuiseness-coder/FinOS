"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BrainCircuit, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Shield,
} from "lucide-react";

interface Trade {
    id: string;
    symbol: string;
    trade_type: string;
    net_pnl: number | null;
    strategy: string | null;
    pre_trade_emotion: string | null;
    post_trade_emotion: string | null;
}

interface TenaliAnalysisProps {
    trades: Trade[];
}

interface AnalysisResult {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    patterns: string[];
    recommendations: string[];
    risk_score: "Low" | "Medium" | "High";
    key_metric: string;
}

const RISK_COLORS: Record<string, string> = {
    Low: "border-green-500/50 text-green-400 bg-green-500/10",
    Medium: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    High: "border-red-500/50 text-red-400 bg-red-500/10",
};

export function TenaliAnalysis({ trades }: TenaliAnalysisProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        if (trades.length === 0) {
            alert("Please add some trades first to get AI analysis.");
            return;
        }
        setIsOpen(true);
        setIsAnalyzing(true);
        setError("");
        setAnalysis(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_TENALI_API_URL || "/api/py";
            const resp = await fetch(`${API_URL}/journal-analysis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trades,
                    user_stats: {},
                }),
            });
            if (!resp.ok) {
                throw new Error(`API error: ${resp.status}`);
            }
            const data: AnalysisResult = await resp.json();
            setAnalysis(data);
        } catch (err: any) {
            console.error("Tenali analysis error:", err);
            setError("Tenali is temporarily unavailable. Please try again in a moment.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="border-indigo-600 text-indigo-400 hover:bg-indigo-600/10"
                    onClick={handleAnalyze}
                >
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Analyze with Tenali
                </Button>
            </DialogTrigger>

            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-400" />
                        Tenali AI — Trading Analysis
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Real AI-powered insights into your trading performance
                    </DialogDescription>
                </DialogHeader>

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-600/30 border-t-indigo-600 animate-spin" />
                            <BrainCircuit className="absolute inset-0 m-auto h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-gray-400 text-sm">Tenali is analyzing your {trades.length} trades…</p>
                        <p className="text-gray-600 text-xs">Reviewing patterns, emotions & risk/reward ratios</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {analysis && !isAnalyzing && (
                    <div className="space-y-4">
                        {/* Summary + Risk Score */}
                        <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-gray-200 text-sm leading-relaxed flex-1">{analysis.summary}</p>
                                <Badge className={`shrink-0 ${RISK_COLORS[analysis.risk_score] || RISK_COLORS.Medium}`}>
                                    <Shield className="h-3 w-3 mr-1" />
                                    {analysis.risk_score} Risk
                                </Badge>
                            </div>
                            {analysis.key_metric && (
                                <p className="text-indigo-400 text-xs mt-3 font-medium">
                                    🎯 Key Focus: {analysis.key_metric}
                                </p>
                            )}
                        </div>

                        {/* Strengths */}
                        {analysis.strengths.length > 0 && (
                            <Card className="bg-green-500/10 border-green-500/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-green-400 mb-2 text-sm">Strengths</h3>
                                            <ul className="space-y-1">
                                                {analysis.strengths.map((s, i) => (
                                                    <li key={i} className="text-sm text-gray-300">• {s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Weaknesses */}
                        {analysis.weaknesses.length > 0 && (
                            <Card className="bg-red-500/10 border-red-500/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingDown className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-red-400 mb-2 text-sm">Areas for Improvement</h3>
                                            <ul className="space-y-1">
                                                {analysis.weaknesses.map((w, i) => (
                                                    <li key={i} className="text-sm text-gray-300">• {w}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Patterns */}
                        {analysis.patterns.length > 0 && (
                            <Card className="bg-yellow-500/10 border-yellow-500/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-yellow-400 mb-2 text-sm">Patterns Detected</h3>
                                            <ul className="space-y-1">
                                                {analysis.patterns.map((p, i) => (
                                                    <li key={i} className="text-sm text-gray-300">• {p}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recommendations */}
                        {analysis.recommendations.length > 0 && (
                            <Card className="bg-indigo-500/10 border-indigo-500/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <Lightbulb className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-indigo-400 mb-2 text-sm">Recommendations</h3>
                                            <ul className="space-y-1">
                                                {analysis.recommendations.map((r, i) => (
                                                    <li key={i} className="text-sm text-gray-300">• {r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <p className="text-xs text-gray-600 text-center pt-2">
                            Tenali provides educational analysis only. Not financial advice. Always do your own research.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
