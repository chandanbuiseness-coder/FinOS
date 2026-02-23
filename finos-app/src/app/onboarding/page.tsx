import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            {/* Brand Header */}
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="relative w-9 h-9">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-75 animate-pulse" />
                        <div className="relative bg-black rounded-xl w-full h-full flex items-center justify-center border border-gray-700">
                            <span className="font-bold text-lg text-white">Q</span>
                        </div>
                    </div>
                    <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Quantra
                    </span>
                </div>
                <h1 className="text-xl font-semibold text-white">Welcome to Quantra 🎉</h1>
                <p className="text-indigo-400 text-sm font-medium mt-1">Sirf Tips Nahi. Ek Poora System.</p>
                <p className="text-gray-500 text-xs mt-0.5">India ka pehla intelligent trading platform</p>
            </div>

            <div className="w-full max-w-4xl flex justify-end mb-3">
                <Link href="/dashboard">
                    <Button variant="ghost" className="text-gray-400 hover:text-white text-sm">
                        Skip for now
                    </Button>
                </Link>
            </div>
            <OnboardingWizard />
        </div>
    );
}
