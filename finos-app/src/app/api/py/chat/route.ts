import { NextRequest } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

const SYSTEM_PROMPT = `You are Tenali AI — the intelligent trading co-pilot of Quantra, the global financial intelligence platform for serious traders.

Your identity:
- You think like a senior quant analyst combined with an experienced market trader
- You speak in clear, professional English — explain jargon when you use it
- You understand global markets deeply: NSE, BSE, Nifty, Bank Nifty, F&O, SEBI, as well as NYSE, NASDAQ, and global indices
- You always give specific, actionable advice: entry price, stop loss, and target price
- You always include position size guidance based on the 2% risk rule
- You are honest — if a setup is weak or a trade is risky, you say so clearly
- You remember the portfolio and journal context provided in the conversation

Your mission: Help traders globally build real wealth through discipline, a proper system, and quant-grade intelligence — not just tips.

Always end with: "Trade with a system, not emotions. Quantra has you covered. 💡"`;

interface Message { role: string; content: string; }

async function streamGemini(messages: Message[]): Promise<ReadableStream> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
    const contents = [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I am Tenali AI — Quantra's intelligent trading co-pilot." }] },
        ...messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        })),
    ];

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
        }),
    });

    if (!resp.ok || !resp.body) throw new Error(`Gemini ${resp.status}`);

    return new ReadableStream({
        async start(controller) {
            const reader = resp.body!.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    try {
                        const chunk = JSON.parse(line.slice(5).trim());
                        const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) controller.enqueue(new TextEncoder().encode(text));
                    } catch { /* skip malformed SSE lines */ }
                }
            }
            controller.close();
        },
    });
}

async function streamGroq(messages: Message[]): Promise<ReadableStream> {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            max_tokens: 1500,
            temperature: 0.7,
            stream: true,
        }),
    });

    if (!resp.ok || !resp.body) throw new Error(`Groq ${resp.status}`);

    return new ReadableStream({
        async start(controller) {
            const reader = resp.body!.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
                    try {
                        const chunk = JSON.parse(line.slice(5).trim());
                        const text = chunk?.choices?.[0]?.delta?.content;
                        if (text) controller.enqueue(new TextEncoder().encode(text));
                    } catch { /* skip */ }
                }
            }
            controller.close();
        },
    });
}

export async function POST(req: NextRequest) {
    const { messages } = await req.json();

    if (!messages?.length) {
        return new Response("Missing messages", { status: 400 });
    }

    // Filter system messages sent from frontend (already handled here)
    const filtered: Message[] = messages.filter((m: Message) => m.role !== "system");

    try {
        if (GEMINI_API_KEY) {
            const stream = await streamGemini(filtered);
            return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        } else if (GROQ_API_KEY) {
            const stream = await streamGroq(filtered);
            return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        } else {
            return new Response("Tenali AI is temporarily unavailable — API keys not configured.", { status: 503 });
        }
    } catch (err: any) {
        // Gemini failed — try Groq fallback
        if (GROQ_API_KEY) {
            try {
                const stream = await streamGroq(filtered);
                return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            } catch { /* fall through */ }
        }
        return new Response(`Tenali AI encountered an error: ${err.message}`, { status: 502 });
    }
}
