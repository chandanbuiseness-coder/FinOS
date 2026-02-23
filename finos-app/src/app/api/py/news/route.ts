import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 20;

async function fetchRSS(url: string, sourceName: string) {
    const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
    });
    if (!resp.ok) throw new Error(`RSS ${resp.status}`);
    const text = await resp.text();

    // Simple XML parsing without DOM parser (edge-compatible)
    const items: any[] = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    for (const item of itemMatches.slice(0, 15)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
            ?? item.match(/<title>(.*?)<\/title>/);
        const link = item.match(/<link>(.*?)<\/link>/)
            ?? item.match(/<link\s+href="(.*?)"/);
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const src = item.match(/<source[^>]*>(.*?)<\/source>/);

        if (title?.[1]) {
            items.push({
                title: title[1].trim(),
                publisher: src?.[1]?.trim() ?? sourceName,
                link: link?.[1]?.trim() ?? "#",
                providerPublishTime: pubDate ? new Date(pubDate[1]).getTime() / 1000 : Date.now() / 1000,
                type: "STORY",
                image: "https://placehold.co/600x400/1e293b/ffffff?text=News",
            });
        }
    }
    return items;
}

const RSS_SOURCES = [
    { name: "Google News", url: "https://news.google.com/rss/search?q=indian+stock+market+nifty&hl=en-IN&gl=IN&ceid=IN:en" },
    { name: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
    { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/MCtopnews.xml" },
];

export async function GET(_req: NextRequest) {
    for (const src of RSS_SOURCES) {
        try {
            const items = await fetchRSS(src.url, src.name);
            if (items.length > 0) {
                return NextResponse.json({ items, source: src.name }, {
                    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
                });
            }
        } catch { /* try next */ }
    }

    // Static fallback
    const now = Date.now() / 1000;
    return NextResponse.json({
        items: [
            { title: "Nifty consolidates near key support; banking sector leads", publisher: "Quantra", link: "#", providerPublishTime: now },
            { title: "RBI maintains stance; markets await next policy decision", publisher: "Quantra", link: "#", providerPublishTime: now - 3600 },
            { title: "FII activity remains positive; Nifty eyes breakout", publisher: "Quantra", link: "#", providerPublishTime: now - 7200 },
        ],
    });
}
