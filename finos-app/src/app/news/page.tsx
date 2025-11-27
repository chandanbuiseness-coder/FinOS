"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";

interface NewsItem {
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
    type: string;
    image?: string;
}

export default function NewsPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const loadNews = async () => {
        setLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_TENALI_API_URL || '/api/py';
            const res = await fetch(`${API_URL}/news`);
            if (res.ok) {
                const data = await res.json();
                setNews(data.items);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error loading news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, []);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Financial News</h1>
                    <p className="text-gray-400 mt-1">Real-time market updates</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                        Updated: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <Button
                        onClick={loadNews}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="border-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading news...</p>
                </div>
            ) : news.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">No news articles found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {news.map((article, index) => (
                        <Card key={index} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
                            {article.image && (
                                <div className="h-48 overflow-hidden rounded-t-lg">
                                    <img
                                        src={article.image}
                                        alt={article.title}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            )}
                            <CardHeader className="flex-1">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                        {article.publisher}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                        {(() => {
                                            try {
                                                return new Date(article.providerPublishTime * 1000).toLocaleDateString();
                                            } catch (e) {
                                                return "Recently";
                                            }
                                        })()}
                                    </span>
                                </div>
                                <CardTitle className="text-white text-lg line-clamp-2 leading-tight">
                                    {article.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-gray-700 hover:bg-gray-800"
                                    onClick={() => window.open(article.link, '_blank')}
                                >
                                    Read More
                                    <ExternalLink className="h-3 w-3 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
