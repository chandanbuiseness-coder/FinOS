"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const steps = [
    { id: 1, title: "Connect Portfolio", description: "Link your broker or add assets manually. Quantra tracks your P&L in real-time." },
    { id: 2, title: "Set Up Your Watchlist", description: "Track the markets that matter to you — indices, stocks, and crypto." },
    { id: 3, title: "Set Your Trading Goal", description: "Tell Tenali AI what you want to achieve — it will guide you accordingly." },
];

interface Asset {
    symbol: string;
    quantity: number;
    buyPrice: number;
}

export function OnboardingWizard() {
    const router = useRouter();
    const supabase = createClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Portfolio
    const [walletBalance, setWalletBalance] = useState("");
    const [manualAssets, setManualAssets] = useState<Asset[]>([]);
    const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
    const [newAsset, setNewAsset] = useState<Asset>({ symbol: "", quantity: 0, buyPrice: 0 });

    // Step 2: Watchlist
    const [selectedWatchlist, setSelectedWatchlist] = useState<string[]>([]);

    // Step 3: Goals
    const [primaryGoal, setPrimaryGoal] = useState("");
    const [riskTolerance, setRiskTolerance] = useState("");

    const handleAddAsset = () => {
        if (newAsset.symbol && newAsset.quantity > 0 && newAsset.buyPrice > 0) {
            setManualAssets([...manualAssets, newAsset]);
            setNewAsset({ symbol: "", quantity: 0, buyPrice: 0 });
            setShowAddAssetDialog(false);
        }
    };

    const handleRemoveAsset = (index: number) => {
        setManualAssets(manualAssets.filter((_, i) => i !== index));
    };

    const handleWatchlistToggle = (item: string) => {
        setSelectedWatchlist(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    // Map display names → tradeable symbols for watchlist
    const WATCHLIST_SYMBOL_MAP: Record<string, { symbol: string; name: string }> = {
        "Nifty 50": { symbol: "^NSEI", name: "Nifty 50" },
        "Sensex": { symbol: "^BSESN", name: "Sensex" },
        "Bank Nifty": { symbol: "^NSEBANK", name: "Bank Nifty" },
        "S&P 500": { symbol: "^GSPC", name: "S&P 500" },
        "Bitcoin": { symbol: "BTC-USD", name: "Bitcoin" },
        "Gold": { symbol: "GC=F", name: "Gold" },
        "Tech Stocks": { symbol: "NIFTY_IT.NS", name: "Nifty IT" },
    };

    const handleNext = async () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        } else {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    // 1. Save onboarding meta (existing)
                    await supabase.from('user_onboarding').upsert({
                        user_id: user.id,
                        wallet_balance: parseFloat(walletBalance) || 0,
                        initial_portfolio: manualAssets,
                        watchlist: selectedWatchlist,
                        financial_goals: { primaryGoal, riskTolerance },
                    });

                    // 2. Save manual assets → user_portfolio
                    if (manualAssets.length > 0) {
                        const portfolioRows = manualAssets.map((a) => ({
                            user_id: user.id,
                            symbol: a.symbol.toUpperCase(),
                            name: a.symbol.toUpperCase(),
                            quantity: a.quantity,
                            avg_price: a.buyPrice,
                        }));
                        await supabase
                            .from('user_portfolio')
                            .upsert(portfolioRows, { onConflict: 'user_id,symbol' });
                    }

                    // 3. Save watchlist selections → user_watchlist
                    if (selectedWatchlist.length > 0) {
                        const watchlistRows = selectedWatchlist
                            .map((item) => WATCHLIST_SYMBOL_MAP[item])
                            .filter(Boolean)
                            .map((w) => ({ user_id: user.id, symbol: w.symbol }));
                        if (watchlistRows.length > 0) {
                            await supabase
                                .from('user_watchlist')
                                .upsert(watchlistRows, { onConflict: 'user_id,symbol' });
                        }
                    }

                    // 4. Save risk tolerance → user_settings
                    if (riskTolerance) {
                        await supabase.from('user_settings').upsert({
                            user_id: user.id,
                            risk_tolerance: riskTolerance,
                        });
                    }
                }

                router.push("/dashboard");
            } catch (error) {
                console.error("Onboarding error:", error);
                alert("An error occurred. Please try again.");
                setIsLoading(false);
            }
        }
    };


    return (
        <Card className="w-[600px] bg-gray-900 border-gray-800 text-white">
            <CardHeader>
                <div className="flex items-center justify-between mb-4">
                    {steps.map((step) => (
                        <div key={step.id} className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${currentStep >= step.id ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"
                                    }`}
                            >
                                {currentStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                            </div>
                            <span className={`text-xs ${currentStep >= step.id ? "text-indigo-400" : "text-gray-500"}`}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>
                <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-gray-400">{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="wallet">Wallet Balance (₹)</Label>
                            <Input
                                id="wallet"
                                type="number"
                                placeholder="Enter your initial wallet balance"
                                className="bg-gray-800 border-gray-700 text-white"
                                value={walletBalance}
                                onChange={(e) => setWalletBalance(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-32 flex flex-col gap-2 border-gray-700 bg-gray-800 hover:bg-gray-700 text-white">
                                <LinkIcon className="h-8 w-8 text-indigo-400" />
                                Connect Broker
                            </Button>

                            <Dialog open={showAddAssetDialog} onOpenChange={setShowAddAssetDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-32 flex flex-col gap-2 border-gray-700 bg-gray-800 hover:bg-gray-700 text-white">
                                        <Plus className="h-8 w-8 text-green-400" />
                                        Add Manually
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                                    <DialogHeader>
                                        <DialogTitle>Add Asset Manually</DialogTitle>
                                        <DialogDescription className="text-gray-400">
                                            Enter the details of your asset
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Symbol</Label>
                                            <Input
                                                placeholder="e.g., RELIANCE, TCS"
                                                className="bg-gray-800 border-gray-700 text-white"
                                                value={newAsset.symbol}
                                                onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                placeholder="Number of shares"
                                                className="bg-gray-800 border-gray-700 text-white"
                                                value={newAsset.quantity || ""}
                                                onChange={(e) => setNewAsset({ ...newAsset, quantity: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Buy Price (₹)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Price per share"
                                                className="bg-gray-800 border-gray-700 text-white"
                                                value={newAsset.buyPrice || ""}
                                                onChange={(e) => setNewAsset({ ...newAsset, buyPrice: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddAsset} className="bg-indigo-600 hover:bg-indigo-700">
                                            Add Asset
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {manualAssets.length > 0 && (
                            <div className="space-y-2">
                                <Label>Added Assets</Label>
                                <div className="space-y-2">
                                    {manualAssets.map((asset, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-700 bg-gray-800">
                                            <div className="flex-1">
                                                <p className="font-medium text-indigo-400">{asset.symbol}</p>
                                                <p className="text-sm text-gray-400">
                                                    {asset.quantity} shares @ ₹{asset.buyPrice.toFixed(2)}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveAsset(index)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-gray-400 text-center">
                            Supported Brokers: Zerodha, Upstox, Groww, Robinhood
                        </p>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {["Nifty 50", "Sensex", "S&P 500", "Bitcoin", "Gold", "Tech Stocks"].map((item) => (
                                <div key={item} className="flex items-center space-x-2 p-3 rounded-lg border border-gray-700 bg-gray-800">
                                    <Checkbox
                                        id={item}
                                        checked={selectedWatchlist.includes(item)}
                                        onCheckedChange={() => handleWatchlistToggle(item)}
                                        className="border-gray-500 data-[state=checked]:bg-indigo-600"
                                    />
                                    <label
                                        htmlFor={item}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Primary Goal</Label>
                            <Input
                                placeholder="e.g., Retirement, Buying a House"
                                className="bg-gray-800 border-gray-700 text-white"
                                value={primaryGoal}
                                onChange={(e) => setPrimaryGoal(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Risk Tolerance</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {["Low", "Moderate", "High"].map((risk) => (
                                    <Button
                                        key={risk}
                                        variant={riskTolerance === risk ? "default" : "outline"}
                                        onClick={() => setRiskTolerance(risk)}
                                        className={
                                            riskTolerance === risk
                                                ? "bg-indigo-600 hover:bg-indigo-700"
                                                : "border-gray-700 bg-gray-800 hover:bg-gray-700 text-white hover:text-indigo-400"
                                        }
                                    >
                                        {risk}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                    className="text-gray-400 hover:text-white"
                >
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isLoading ? "Saving..." : currentStep === steps.length ? "Go to Dashboard →" : "Next Step"}
                </Button>
            </CardFooter>
        </Card>
    );
}
