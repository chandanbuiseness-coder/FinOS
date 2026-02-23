"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, BrainCircuit, TrendingUp, PieChart, BarChart3, Zap } from "lucide-react";
import { chatWithTenali } from "@/lib/api/tenali";

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hello! I'm Tenali AI — Quantra's intelligent trading co-pilot. 🚀\n\nI can help you with:\n• Market analysis (NSE/BSE/Global)\n• Portfolio insights and risk assessment\n• Trade setups with entry, stop-loss, and target\n• Options strategies and technical analysis\n\nWhat would you like to analyze today?",
        },
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsStreaming(true);

        try {
            const stream = await chatWithTenali([...messages, userMessage]);
            const reader = stream.getReader();
            const decoder = new TextDecoder();

            let assistantMessage: Message = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantMessage.content += chunk;
                setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
        } catch (error) {
            console.error('Tenali AI error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again in a moment.',
            }]);
        } finally {
            setIsStreaming(false);
        }
    };

    const quickActions = [
        { label: 'Portfolio Analysis', icon: PieChart, query: 'Analyze my current portfolio — what is strong, what is weak, and what should I watch?' },
        { label: 'Market Overview', icon: TrendingUp, query: 'Give me a comprehensive market overview for today — Nifty, Bank Nifty, global cues.' },
        { label: 'Nifty 50 Analysis', icon: BarChart3, query: 'Provide technical and fundamental analysis of Nifty 50 — support, resistance, trend.' },
        { label: 'Risk Assessment', icon: BrainCircuit, query: 'Assess the risk in my current portfolio — concentration risk, sector exposure, max drawdown.' },
        { label: 'Build My System', icon: Zap, query: 'Help me build a complete trading system with entry rules, exit rules, position sizing, and journaling.' },
    ];

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-800 p-4 bg-gray-950/80 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-900/50">
                        <BrainCircuit className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Tenali AI</h1>
                        <p className="text-xs text-indigo-400">Quantra's intelligent trading co-pilot</p>
                    </div>
                    <div className="ml-auto">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 font-medium">
                            ● Live
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mr-2 mt-1 shrink-0">
                                <BrainCircuit className="h-3.5 w-3.5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-gray-800/80 text-gray-100 border border-gray-700/50 rounded-tl-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mr-2 shrink-0">
                            <BrainCircuit className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-700/50">
                            <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions + Input */}
            <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-950/60">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {quickActions.map((action, i) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={i}
                                variant="outline"
                                onClick={() => setInput(action.query)}
                                className="h-auto py-2.5 flex flex-col items-center gap-1.5 border-gray-700/60 bg-gray-800/60 hover:bg-gray-700/80 hover:border-indigo-600/60 text-white transition-all"
                                disabled={isStreaming}
                            >
                                <Icon className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] leading-tight text-center">{action.label}</span>
                            </Button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask Tenali AI about markets, trades, or your portfolio..."
                        className="flex-1 bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-600 rounded-xl"
                        disabled={isStreaming}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isStreaming || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-4"
                    >
                        {isStreaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <p className="text-[10px] text-gray-600 text-center">
                    Tenali AI provides educational analysis only — not registered investment advice. Always do your own research.
                </p>
            </div>
        </div>
    );
}
