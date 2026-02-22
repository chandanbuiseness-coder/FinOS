# FinOS — Phase 0 Setup Guide
## What changed and what you need to do

---

## 🔑 Step 1: Get Your Free API Keys (5 minutes)

### Gemini 2.0 Flash (Primary LLM)
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key and paste it in `.env.local`:
   ```
   GEMINI_API_KEY=AIza...your_key_here
   ```

### Groq (Fallback LLM - ultra fast)
1. Go to https://console.groq.com/keys
2. Create a free account and generate an API key
3. Paste it in `.env.local`:
   ```
   GROQ_API_KEY=gsk_...your_key_here
   ```

---

## 🗄️ Step 2: Run Supabase SQL (5 minutes)

1. Go to your Supabase project → SQL Editor
2. Open `finos-app/supabase_portfolio_schema.sql`
3. Copy the entire file contents and paste in SQL editor
4. Click "Run"

This creates:
- `user_portfolio` table (replaces localStorage)
- `user_watchlist` table (replaces localStorage)
- `user_settings` table (for the new Settings page)
- All Row Level Security (RLS) policies

---

## 🚀 Step 3: Start the App

### Terminal 1 — Python Backend
```bash
cd finos-app
pip install -r requirements.txt
python -m uvicorn api.index:app --reload --port 8000
```

### Terminal 2 — Next.js Frontend
```bash
cd finos-app
npm run dev
```

---

## ✅ What's Fixed

| Feature | Before | After |
|---------|--------|-------|
| **Tenali Chat** | HuggingFace (quota fails daily) | Gemini 2.0 Flash → Groq fallback |
| **Journal AI Analysis** | Fake rule-based simulation | Real Gemini API call with actual insights |
| **Portfolio/Watchlist** | localStorage (disappears on browser clear) | Supabase database with RLS |
| **Market Open/Closed** | Always showed "Open" | Real NSE calendar with holidays + hours |
| **Settings Page** | Empty placeholder | Full settings: risk, lot size, notifications |
| **Portfolio Page** | Duplicate of dashboard | Allocation pie chart + P&L breakdown |
| **News Sources** | One RSS feed | Google News → Economic Times → Moneycontrol → Gemini |
| **Indices Data** | Hardcoded static numbers | Live from backend (yFinance + Gemini fallback) |

---

## 💡 LLM Priority Chain

```
User sends message
       │
       ▼
  Gemini 2.0 Flash (free, 1M tokens/day)
       │
  If rate limited (429) ──► Groq Llama-3.1-8B (14,400 req/day free)
       │
  If both fail ────────────► "Tenali will be back in a moment"
```

---

## 📌 Free Tier Limits Reference

| Service | Limit | Your Usage |
|---------|-------|-----------|
| Gemini 2.0 Flash | 15 req/min, 1M tokens/day | ~100 chat sessions/day |
| Groq Llama-3.1-8B | 14,400 req/day | Unlimited backup |
| Supabase | 500MB, 50K users | ~2,000 active users |
| Vercel | 100GB bandwidth | ~50,000 MAU |
| **Total cost** | **₹0/month** | Until meaningful scale |
