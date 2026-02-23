"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart2,
  Settings,
  PieChart,
  TrendingUp,
  BookOpen,
} from "lucide-react";

const routes = [
  { label: "Tenali AI", icon: MessageSquare, href: "/chat", color: "text-sky-500" },
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-violet-500" },
  { label: "Market", icon: TrendingUp, href: "/market", color: "text-pink-500" },
  { label: "Trades", icon: BarChart2, href: "/trades", color: "text-orange-400" },
  { label: "Portfolio", icon: PieChart, href: "/portfolio", color: "text-emerald-500" },
  { label: "Trading Journal", icon: BookOpen, href: "/journal", color: "text-amber-500" },
  { label: "Settings", icon: Settings, href: "/settings", color: "text-gray-400" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white border-r border-gray-800">
      <div className="px-3 py-2 flex-1">
        {/* Logo + Brand */}
        <Link href="/dashboard" className="flex items-center pl-3 mb-3">
          <div className="relative w-8 h-8 mr-3 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg blur opacity-75 animate-pulse" />
            <div className="relative bg-black rounded-lg w-full h-full flex items-center justify-center border border-gray-700">
              <span className="font-bold text-xl text-white">Q</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Quantra
          </h1>
        </Link>

        {/* Tagline */}
        <p className="text-xs text-gray-500 italic pl-3 mb-8 leading-tight">
          Not Just Tips. A Complete System.
        </p>

        {/* Nav links */}
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-4">
        <p className="text-[10px] text-gray-600 leading-tight">
          Stop trading in the dark. Build a real system.
        </p>
        <p className="text-[10px] text-gray-700 mt-0.5">quantra.in</p>
      </div>
    </div>
  );
}
