import { AuthForm } from "@/components/auth/AuthForm";

export default function RegisterPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            <div className="text-center mb-8">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="relative w-10 h-10">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-75 animate-pulse" />
                        <div className="relative bg-black rounded-xl w-full h-full flex items-center justify-center border border-gray-700">
                            <span className="font-bold text-xl text-white">Q</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Quantra
                    </h1>
                </div>
                <p className="text-white font-semibold text-lg">Stop Trading in the Dark.</p>
                <p className="text-gray-400 text-sm mt-1">Join traders building real wealth with a complete system.</p>
            </div>
            <AuthForm type="register" />
        </div>
    );
}
