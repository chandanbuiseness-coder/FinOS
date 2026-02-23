# Quantra AI

> **Sirf Tips Nahi. Ek Poora System.**

India's intelligent trading platform for retail traders.
Algo signals + Tenali AI coaching + Trading journal + Wealth building.

**"Ab Andhere Mein Mat Trade Karo."**

---

## 🚀 What is Quantra?

Quantra democratizes institutional-grade intelligence for Indian retail traders.
Stop trading in the dark — use a complete system.

| Feature | What it does |
|---|---|
| **Trade Scanner** | 7 algorithms scanning Nifty 500 for intraday, swing & long-term setups |
| **Tenali AI** | Your intelligent trading co-pilot — NSE/BSE expert, speaks Hinglish |
| **Trading Journal** | Track every trade, see patterns, improve discipline |
| **Portfolio** | Real-time P&L, sector breakdown, risk metrics |
| **Market Dashboard** | Live Nifty, Sensex, Bank Nifty, Gold, crypto prices |

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python) + yFinance + Gemini 2.0 Flash
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash (primary) + Groq Llama-3.1-8B (fallback)
- **Deployment**: Vercel (frontend + Python serverless)

---

## 🏃 Running Locally

### Quick Start (Windows)
```bash
cd finos-app
run_api.bat          # starts both servers in separate windows
```

### Manual
```bash
# Terminal 1 — Python backend
cd finos-app
python -m uvicorn api.index:app --reload --port 8000

# Terminal 2 — Next.js frontend  
cd finos-app
npm run dev -- --port 3001
```

Open: **http://localhost:3001**

---

## ⚙️ Environment Variables

Create `finos-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_av_key
NEXT_PUBLIC_TENALI_API_URL=http://localhost:8000/api/py
```

---

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import repo on [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** → `finos-app`
4. Add all env vars (do NOT set `NEXT_PUBLIC_TENALI_API_URL` on Vercel)
5. Deploy ✅

---

## 📊 Trade Scanner Algorithms

| Algorithm | Type | Universe |
|---|---|---|
| ORB (Opening Range Breakout) | Intraday | Nifty 50 |
| Supertrend + EMA Cross | Intraday | Nifty 50 |
| 52-Week Breakout | Swing | Nifty 500 |
| RSI Bounce | Swing | Nifty 500 |
| EMA 20/50 Cross | Swing | Nifty 500 |
| Bollinger Band Squeeze | Swing | Nifty 500 |
| Quality Value (Piotroski) | Long-Term | Nifty 500 |

---

*Quantra — Not Just Tips. A Complete System.*  
*Target domain: quantra.in / quantra.ai*
