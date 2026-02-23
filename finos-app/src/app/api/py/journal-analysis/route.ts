import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export async function POST(req: NextRequest) {
    const { trades } = await req.json().catch(() => ({ trades: [] }));

    if (!GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "AI analysis unavailable — GEMINI_API_KEY not configured" },
            { status: 503 }
        );
    }

    const tradesSummary = trades
        ?.slice(0, 50)
        .map((t: any) =>
            `${t.symbol} | ${t.type} | Entry:${t.entry_price} Exit:${t.exit_price ?? "open"} | P&L:${t.pnl ?? "N/A"} | Date:${t.date}`
        )
        .join("\n") ?? "No trades provided";

    const prompt = `Analyze this trading journal and give a comprehensive coaching report.

TRADES:
${tradesSummary}

Provide a structured JSON response with:
{
  "summary": "2-3 sentence summary of overall performance",
  "win_rate": 0.0,
  "average_rr": 0.0,
  "biggest_mistake": "...",
  "biggest_strength": "...",
  "patterns": ["pattern1", "pattern2", "..."],
  "recommendations": ["action1", "action2", "action3"],
  "psychological_insights": "...",
  "score": 0
}

Be specific, data-driven, and actionable. score is 0-100 for overall trading discipline.`;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
                }),
            }
        );

        if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");

        const analysis = JSON.parse(jsonMatch[0]);
        return NextResponse.json(analysis);
    } catch (err: any) {
        return NextResponse.json(
            { error: `Analysis failed: ${err.message}` },
            { status: 500 }
        );
    }
}
