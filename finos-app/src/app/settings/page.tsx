"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Shield, Bell, TrendingUp, User, LogOut, CheckCircle2, Loader2, Palette,
    IndianRupee, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

type RiskTolerance = "Low" | "Moderate" | "High";

interface Settings {
    risk_tolerance: RiskTolerance;
    default_lot_size: number;
    notifications_email: boolean;
    notifications_alerts: boolean;
    default_currency: string;
}

const DEFAULT_SETTINGS: Settings = {
    risk_tolerance: "Moderate",
    default_lot_size: 1,
    notifications_email: true,
    notifications_alerts: true,
    default_currency: "INR",
};

const RISK_OPTIONS: { value: RiskTolerance; label: string; desc: string; color: string }[] = [
    { value: "Low", label: "Conservative", desc: "Capital preservation, steady returns", color: "border-green-600 bg-green-600/20 text-green-400" },
    { value: "Moderate", label: "Balanced", desc: "Mix of growth and safety", color: "border-yellow-600 bg-yellow-600/20 text-yellow-400" },
    { value: "High", label: "Aggressive", desc: "Maximum growth, high volatility", color: "border-red-600 bg-red-600/20 text-red-400" },
];

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load user + settings
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email ?? "");
            setUserName(user.user_metadata?.full_name ?? "Trader");

            const { data } = await supabase
                .from("user_settings")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (data) {
                setSettings({
                    risk_tolerance: data.risk_tolerance ?? "Moderate",
                    default_lot_size: data.default_lot_size ?? 1,
                    notifications_email: data.notifications_email ?? true,
                    notifications_alerts: data.notifications_alerts ?? true,
                    default_currency: data.default_currency ?? "INR",
                });
            }
            setIsLoading(false);
        })();
    }, [supabase]);

    const handleSave = async () => {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("user_settings").upsert({
            user_id: user.id,
            ...settings,
        });
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const toggle = (key: keyof Settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof Settings] }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-white">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400 mt-1">Configure your Quantra experience</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isSaving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                    ) : saved ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />Saved!</>
                    ) : (
                        "Save Changes"
                    )}
                </Button>
            </div>

            {/* Profile Card */}
            <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-indigo-400" />
                        Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xl font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-white font-semibold text-lg">{userName}</p>
                            <p className="text-gray-400 text-sm">{userEmail}</p>
                            <Badge variant="outline" className="mt-1 border-indigo-600/50 text-indigo-400 text-xs">
                                Free Plan
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Tolerance */}
            <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5 text-indigo-400" />
                        Risk Tolerance
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Used by Tenali AI to personalise analysis and recommendations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {RISK_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setSettings((s) => ({ ...s, risk_tolerance: opt.value }))}
                                className={`rounded-lg p-4 border-2 text-left transition-all ${settings.risk_tolerance === opt.value
                                    ? opt.color
                                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"}`}
                            >
                                {settings.risk_tolerance === opt.value && (
                                    <CheckCircle2 className="h-4 w-4 mb-2 opacity-80" />
                                )}
                                <p className="font-semibold text-sm">{opt.label}</p>
                                <p className="text-xs opacity-70 mt-1">{opt.desc}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Trading Preferences */}
            <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-indigo-400" />
                        Trading Preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Default Lot Size */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white font-medium">Default Lot Size</Label>
                            <p className="text-gray-400 text-sm">Pre-fills lot quantity in trade forms</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSettings((s) => ({ ...s, default_lot_size: Math.max(1, s.default_lot_size - 1) }))}
                                className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 font-bold"
                            >−</button>
                            <span className="w-10 text-center text-white font-semibold text-lg">
                                {settings.default_lot_size}
                            </span>
                            <button
                                onClick={() => setSettings((s) => ({ ...s, default_lot_size: s.default_lot_size + 1 }))}
                                className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 font-bold"
                            >+</button>
                        </div>
                    </div>

                    {/* Default Currency */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white font-medium">Default Currency</Label>
                            <p className="text-gray-400 text-sm">Display currency for P&L</p>
                        </div>
                        <div className="flex gap-2">
                            {["INR", "USD"].map((cur) => (
                                <button
                                    key={cur}
                                    onClick={() => setSettings((s) => ({ ...s, default_currency: cur }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${settings.default_currency === cur
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}
                                >
                                    {cur === "INR" ? "₹ INR" : "$ USD"}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="h-5 w-5 text-indigo-400" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { key: "notifications_email", label: "Email Alerts", desc: "Weekly journal digest and important updates" },
                        { key: "notifications_alerts", label: "Price Alerts", desc: "Notify when watchlist stocks hit your target" },
                    ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-1">
                            <div>
                                <Label className="text-white font-medium">{label}</Label>
                                <p className="text-gray-400 text-sm">{desc}</p>
                            </div>
                            <button
                                onClick={() => toggle(key as keyof Settings)}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {(settings as any)[key] ? (
                                    <ToggleRight className="h-8 w-8" />
                                ) : (
                                    <ToggleLeft className="h-8 w-8 text-gray-600" />
                                )}
                            </button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Broker Connect Placeholder */}
            <Card className="bg-gray-900 border-gray-800 text-white border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-gray-400">
                        <IndianRupee className="h-5 w-5" />
                        Broker Integration
                        <Badge variant="outline" className="border-yellow-600/50 text-yellow-500 text-xs">
                            Coming Soon
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Connect Zerodha, Upstox, or Angel One for automatic trade sync.
                        Direct SmartAPI integration is in active development.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        {["Zerodha", "Upstox", "Angel One", "Groww"].map((broker) => (
                            <div
                                key={broker}
                                className="px-3 py-2 rounded-lg border border-gray-700 text-gray-500 text-sm opacity-60"
                            >
                                {broker}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-950/20 border-red-900/40 text-white">
                <CardHeader>
                    <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
                        <LogOut className="h-5 w-5" />
                        Account
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
