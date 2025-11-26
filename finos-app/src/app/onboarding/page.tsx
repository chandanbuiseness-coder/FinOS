import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            <div className="w-full max-w-4xl flex justify-end mb-4">
                <Link href="/dashboard">
                    <Button variant="ghost" className="text-gray-400 hover:text-white">
                        Skip for now
                    </Button>
                </Link>
            </div>
            <OnboardingWizard />
        </div>
    );
}
