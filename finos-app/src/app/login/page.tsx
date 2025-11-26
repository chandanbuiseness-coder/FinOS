import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Welcome to Finos</h1>
                <p className="text-gray-400 text-lg">Making finance easier with finos</p>
            </div>
            <AuthForm type="login" />
        </div>
    );
}
