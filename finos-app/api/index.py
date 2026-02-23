from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import json
import yfinance as yf
from datetime import datetime, date
import pytz
import pandas as pd
import io
import difflib
import time
from typing import List, Dict, Optional

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Scanner import ────────────────────────────────────────────────────────────
try:
    from api.scanner import run_scan as _run_scan
except ImportError:
    try:
        from scanner import run_scan as _run_scan
    except ImportError:
        _run_scan = None


# ── API Keys ─────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")

# ── NSE Holiday List 2025 (official) ─────────────────────────────────────────
NSE_HOLIDAYS_2025 = {
    date(2025, 1, 26),   # Republic Day
    date(2025, 2, 26),   # Mahashivratri
    date(2025, 3, 14),   # Holi
    date(2025, 3, 31),   # Id-Ul-Fitr (Eid)
    date(2025, 4, 10),   # Shri Ram Navami
    date(2025, 4, 14),   # Dr. Baba Saheb Ambedkar Jayanti
    date(2025, 4, 18),   # Good Friday
    date(2025, 5, 1),    # Maharashtra Day
    date(2025, 8, 15),   # Independence Day
    date(2025, 8, 27),   # Ganesh Chaturthi
    date(2025, 10, 2),   # Gandhi Jayanti
    date(2025, 10, 2),   # Dussehra
    date(2025, 10, 20),  # Diwali - Laxmi Pujan (muhurat trading only)
    date(2025, 10, 21),  # Diwali - Balipratipada
    date(2025, 11, 5),   # Prakash Gurpurb Sri Guru Nanak Dev
    date(2025, 12, 25),  # Christmas
}

NSE_HOLIDAYS_2026 = {
    date(2026, 1, 26),   # Republic Day
    date(2026, 3, 4),    # Mahashivaratri (approx)
    date(2026, 4, 3),    # Good Friday (approx)
    date(2026, 4, 14),   # Dr. Ambedkar Jayanti
    date(2026, 5, 1),    # Maharashtra Day
    date(2026, 8, 15),   # Independence Day
    date(2026, 10, 2),   # Gandhi Jayanti
    date(2026, 12, 25),  # Christmas
}

def is_nse_open(now_ist: datetime) -> str:
    today = now_ist.date()
    # Weekend
    if now_ist.weekday() >= 5:
        return "Closed"
    # Holiday
    all_holidays = NSE_HOLIDAYS_2025 | NSE_HOLIDAYS_2026
    if today in all_holidays:
        return "Holiday"
    # Market hours: 09:15 – 15:30 IST
    market_open  = now_ist.replace(hour=9,  minute=15, second=0, microsecond=0)
    market_close = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
    pre_open     = now_ist.replace(hour=9,  minute=0,  second=0, microsecond=0)
    if pre_open <= now_ist < market_open:
        return "Pre-Open"
    if market_open <= now_ist <= market_close:
        return "Open"
    return "Closed"

def get_market_status(symbol: str) -> str:
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)
    if "-USD" in symbol:
        return "Open"   # Crypto — 24/7
    if "=X" in symbol:
        return "Open"   # Forex — mostly 24/5
    if ".NS" in symbol or ".BO" in symbol or symbol in {"^NSEI", "^BSESN", "^NSEBANK"}:
        return is_nse_open(now)
    # US Markets (Eastern time)
    et = pytz.timezone("US/Eastern")
    us  = datetime.now(et)
    if us.weekday() >= 5:
        return "Closed"
    us_open  = us.replace(hour=9,  minute=30, second=0, microsecond=0)
    us_close = us.replace(hour=16, minute=0,  second=0, microsecond=0)
    return "Open" if us_open <= us <= us_close else "Closed"

# ── Market Context (for chat prompt) ─────────────────────────────────────────
market_cache = {"data": "", "timestamp": 0}

def get_market_context():
    global market_cache
    current_time = time.time()
    if current_time - market_cache["timestamp"] < 300 and market_cache["data"]:
        return market_cache["data"]
    try:
        tickers = {"^NSEI": "Nifty 50", "^NSEBANK": "Bank Nifty", "INR=X": "USD/INR"}
        data_text = [f"Date: {datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%d-%b %H:%M IST')}"]
        for ticker, name in tickers.items():
            try:
                hist = yf.Ticker(ticker).history(period="2d")
                if len(hist) >= 1:
                    current = hist['Close'].iloc[-1]
                    if len(hist) >= 2:
                        change = ((current - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100
                        data_text.append(f"{name}: {current:,.0f} ({change:+.2f}%)")
                    else:
                        data_text.append(f"{name}: {current:,.0f}")
            except:
                continue
        result = " | ".join(data_text)
        market_cache["data"] = result
        market_cache["timestamp"] = current_time
        return result
    except:
        return market_cache["data"]

# ── Static Ticker Map ─────────────────────────────────────────────────────────
STATIC_TICKER_MAP = {
    # US Tech
    "APPLE": "AAPL", "MICROSOFT": "MSFT", "GOOGLE": "GOOGL", "AMAZON": "AMZN",
    "TESLA": "TSLA", "META": "META", "NETFLIX": "NFLX", "NVIDIA": "NVDA",
    "AMD": "AMD", "INTEL": "INTC", "COINBASE": "COIN", "ORACLE": "ORCL",
    "IBM": "IBM", "SALESFORCE": "CRM", "ADOBE": "ADBE", "UBER": "UBER",
    # Crypto
    "BITCOIN": "BTC-USD", "BTC": "BTC-USD",
    "ETHEREUM": "ETH-USD", "ETH": "ETH-USD",
    "SOLANA": "SOL-USD", "SOL": "SOL-USD",
    "DOGECOIN": "DOGE-USD", "DOGE": "DOGE-USD",
    "RIPPLE": "XRP-USD", "XRP": "XRP-USD",
    "CARDANO": "ADA-USD", "ADA": "ADA-USD",
    "SHIBA": "SHIB-USD", "SHIB": "SHIB-USD",
    "MATIC": "MATIC-USD", "POLYGON": "MATIC-USD",
    "LITECOIN": "LTC-USD", "LTC": "LTC-USD",
    "BINANCE": "BNB-USD", "BNB": "BNB-USD",
    # NSE Top Stocks
    "RELIANCE": "RELIANCE.NS", "RIL": "RELIANCE.NS",
    "TCS": "TCS.NS", "TATA CONSULTANCY": "TCS.NS",
    "HDFC BANK": "HDFCBANK.NS", "HDFC": "HDFCBANK.NS",
    "INFOSYS": "INFY.NS", "INFY": "INFY.NS",
    "ICICI": "ICICIBANK.NS", "ICICI BANK": "ICICIBANK.NS",
    "SBI": "SBIN.NS", "STATE BANK": "SBIN.NS",
    "BHARTI AIRTEL": "BHARTIARTL.NS", "AIRTEL": "BHARTIARTL.NS",
    "ITC": "ITC.NS",
    "KOTAK": "KOTAKBANK.NS", "KOTAK BANK": "KOTAKBANK.NS",
    "L&T": "LT.NS", "LARSEN": "LT.NS",
    "AXIS BANK": "AXISBANK.NS", "AXIS": "AXISBANK.NS",
    "HUL": "HINDUNILVR.NS", "HINDUSTAN UNILEVER": "HINDUNILVR.NS",
    "TATA MOTORS": "TATAMOTORS.NS",
    "MARUTI": "MARUTI.NS",
    "SUN PHARMA": "SUNPHARMA.NS",
    "ASIAN PAINTS": "ASIANPAINT.NS",
    "TITAN": "TITAN.NS",
    "BAJAJ FINANCE": "BAJFINANCE.NS",
    "ULTRATECH": "ULTRACEMCO.NS",
    "WIPRO": "WIPRO.NS",
    "NESTLE": "NESTLEIND.NS",
    "ZOMATO": "ZOMATO.NS",
    "PAYTM": "PAYTM.NS",
    "JIO": "JIOFIN.NS", "JIO FINANCIAL": "JIOFIN.NS",
    "OLA": "OLAELEC.NS", "OLA ELECTRIC": "OLAELEC.NS",
    "ADANI ENT": "ADANIENT.NS", "ADANI ENTERPRISES": "ADANIENT.NS",
    "ADANI PORTS": "ADANIPORTS.NS",
    "ADANI GREEN": "ADANIGREEN.NS",
    "ADANI POWER": "ADANIPOWER.NS",
    "POWER GRID": "POWERGRID.NS",
    "NTPC": "NTPC.NS",
    "ONGC": "ONGC.NS",
    "COAL INDIA": "COALINDIA.NS",
    "TATA STEEL": "TATASTEEL.NS",
    "JSW STEEL": "JSWSTEEL.NS",
    "HINDALCO": "HINDALCO.NS",
    "GRASIM": "GRASIM.NS",
    "CIPLA": "CIPLA.NS",
    "DR REDDY": "DRREDDY.NS",
    "APOLLO HOSP": "APOLLOHOSP.NS",
    "DIVIS LAB": "DIVISLAB.NS",
    "TECH MAHINDRA": "TECHM.NS", "TECHM": "TECHM.NS",
    "HCL TECH": "HCLTECH.NS",
    "EICHER MOTORS": "EICHERMOT.NS",
    "HERO MOTO": "HEROMOTOCO.NS",
    "BAJAJ AUTO": "BAJAJ-AUTO.NS",
    "M&M": "M&M.NS", "MAHINDRA": "M&M.NS",
    "BRITANNIA": "BRITANNIA.NS",
    "INDUSIND": "INDUSINDBK.NS",
    "BPCL": "BPCL.NS",
    "UPL": "UPL.NS",
    "SBILIFE": "SBILIFE.NS",
    "HDFC LIFE": "HDFCLIFE.NS",
    "BAJAJ FINSERV": "BAJAJFINSV.NS",
    "DLF": "DLF.NS",
    "HAL": "HAL.NS", "HINDUSTAN AERO": "HAL.NS",
    "BEL": "BEL.NS", "BHARAT ELECTRONICS": "BEL.NS",
    "IRCTC": "IRCTC.NS",
    "RVNL": "RVNL.NS",
    "IRFC": "IRFC.NS",
    "MAZAGON": "MAZDOCK.NS",
    "COCHIN SHIP": "COCHINSHIP.NS",
    "BHEL": "BHEL.NS",
    "SAIL": "SAIL.NS",
    "VEDANTA": "VEDL.NS",
    "YES BANK": "YESBANK.NS",
    "IDEA": "IDEA.NS", "VODAFONE": "IDEA.NS",
    "SUZLON": "SUZLON.NS",
    "TATA POWER": "TATAPOWER.NS",
    "TATA CHEM": "TATACHEM.NS",
    "TATA ELXSI": "TATAELXSI.NS",
    "TRENT": "TRENT.NS",
    "ZEE": "ZEEL.NS",
    "NYKAA": "NYKAA.NS",
    "DELHIVERY": "DELHIVERY.NS",
    "POLICYBAZAAR": "POLICYBZR.NS",
    "LICI": "LICI.NS", "LIC": "LICI.NS",
}

TICKER_MAP   = STATIC_TICKER_MAP.copy()
TICKER_NAMES = list(TICKER_MAP.keys())
_nse_loaded  = False

def load_ticker_map():
    global TICKER_MAP, TICKER_NAMES, _nse_loaded
    if _nse_loaded:
        return
    try:
        url     = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp    = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            df = pd.read_csv(io.StringIO(resp.text))
            for _, row in df.iterrows():
                symbol     = f"{row['SYMBOL']}.NS"
                name       = row["NAME OF COMPANY"].upper()
                TICKER_MAP[row["SYMBOL"].upper()] = symbol
                TICKER_MAP[name] = symbol
                first = name.split()[0]
                if len(first) > 2 and first not in TICKER_MAP:
                    TICKER_MAP[first] = symbol
            TICKER_NAMES = list(TICKER_MAP.keys())
            _nse_loaded  = True
    except:
        pass

# ── Gemini Helper ─────────────────────────────────────────────────────────────
gemini_cache: Dict = {}

def _gemini_generate(prompt: str, system: str = "") -> str:
    """Call Gemini 2.0 Flash REST API directly (no SDK needed)."""
    if not GEMINI_API_KEY:
        raise ValueError("No GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    contents = []
    if system:
        contents.append({"role": "user", "parts": [{"text": f"[System]: {system}\n\n{prompt}"}]})
    else:
        contents.append({"role": "user", "parts": [{"text": prompt}]})
    payload  = {"contents": contents, "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024}}
    resp     = requests.post(url, json=payload, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

def _gemini_stream(messages: List[Dict], system: str = ""):
    """Stream from Gemini 2.0 Flash — yields text chunks."""
    if not GEMINI_API_KEY:
        yield "Tenali AI is temporarily unavailable — GEMINI_API_KEY not configured."
        return
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
    contents = []
    if system:
        # Gemini doesn't have a system role in v1beta, prepend as first user turn
        contents.append({"role": "user", "parts": [{"text": system}]})
        contents.append({"role": "model", "parts": [{"text": "Understood. I am Tenali AI — Quantra's intelligent trading co-pilot."}]})
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1500},
    }
    try:
        with requests.post(url, json=payload, stream=True, timeout=60) as r:
            for line in r.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data:"):
                        try:
                            chunk = json.loads(decoded[5:].strip())
                            text  = chunk["candidates"][0]["content"]["parts"][0]["text"]
                            yield text
                        except:
                            pass
    except Exception as e:
        yield f"\n\n[Tenali AI encountered an issue: {str(e)}]"

def _groq_stream(messages: List[Dict], system: str = ""):
    """Stream from Groq Llama-3.1-8B — fallback when Gemini rate-limits."""
    if not GROQ_API_KEY:
        yield "Tenali AI is busy right now (Groq fallback unavailable). Please try again."
        return
    url = "https://api.groq.com/openai/v1/chat/completions"
    groq_messages = [{"role": "system", "content": system}] if system else []
    for msg in messages:
        groq_messages.append({"role": msg["role"], "content": msg["content"]})
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": groq_messages,
        "max_tokens": 1500,
        "temperature": 0.7,
        "stream": True,
    }
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    try:
        with requests.post(url, json=payload, headers=headers, stream=True, timeout=60) as r:
            for line in r.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data:") and "[DONE]" not in decoded:
                        try:
                            chunk = json.loads(decoded[5:].strip())
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except:
                            pass
    except Exception as e:
        yield f"\n\n[Tenali AI groq-fallback error: {str(e)}]"

def get_gemini_fallback(prompt_type: str, query) -> Optional[Dict]:
    """Use Gemini to generate fallback market/news data when APIs fail."""
    if not GEMINI_API_KEY:
        return None
    cache_key = f"{prompt_type}:{str(query)}"
    if cache_key in gemini_cache:
        if (time.time() - gemini_cache[cache_key]["time"]) < 300:
            return gemini_cache[cache_key]["data"]
    try:
        if prompt_type == "quote":
            prompt = f"""You are a financial data API.
Provide a REALISTIC ESTIMATE for the current price of: {query}
Return ONLY a JSON object (no markdown): {{"price": float, "change": float, "change_percent": float}}"""
            text = _gemini_generate(prompt)
            data = json.loads(text.strip().replace("```json", "").replace("```", ""))
            result = {
                "symbol": query,
                "price": data.get("price", 100.0),
                "change": data.get("change", 0.0),
                "change_percent": data.get("change_percent", 0.0),
                "day_high": data.get("price", 100.0) * 1.02,
                "day_low":  data.get("price", 100.0) * 0.98,
                "volume": 1_000_000,
                "previous_close": data.get("price", 100.0) - data.get("change", 0.0),
                "currency": "INR" if ".NS" in query else "USD",
                "source": "AI_ESTIMATE",
            }
            gemini_cache[cache_key] = {"time": time.time(), "data": result}
            return result

        elif prompt_type == "market_batch":
            prompt = f"""You are a financial data API.
Provide REALISTIC current market prices for: {', '.join(query)}
Return ONLY a JSON object (no markdown) where keys are symbols:
{{"^NSEI": {{"price": 22000, "change": 100, "change_percent": 0.5}}, ...}}"""
            text = _gemini_generate(prompt)
            data = json.loads(text.strip().replace("```json", "").replace("```", ""))
            gemini_cache[cache_key] = {"time": time.time(), "data": data}
            return data

        elif prompt_type == "news":
            prompt = """Generate 10 realistic financial news headlines for today.
Focus on Indian markets (Nifty, Sensex, NSE stocks). Be specific, not generic.
Return ONLY a JSON array (no markdown):
[{"title": "...", "publisher": "Economic Times", "link": "#"}, ...]"""
            text  = _gemini_generate(prompt)
            items_raw = json.loads(text.strip().replace("```json", "").replace("```", ""))
            now   = int(time.time())
            items = [{
                "title": i.get("title"),
                "publisher": i.get("publisher", "AI News"),
                "link": "#",
                "providerPublishTime": now,
                "type": "STORY",
                "image": f"https://placehold.co/600x400/1e293b/ffffff?text=News",
            } for i in items_raw]
            result = {"items": items}
            gemini_cache[cache_key] = {"time": time.time(), "data": result}
            return result

    except Exception as e:
        print(f"Gemini fallback error: {e}")
        return None

# ── Request Models ─────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[Dict] = {}
    stream: bool = True

class QuoteRequest(BaseModel):
    symbol: str

class JournalAnalysisRequest(BaseModel):
    trades: List[Dict]
    user_stats: Optional[Dict] = {}

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/py/market")
async def get_market_data():
    """Fetch global market indices, crypto, and forex with Gemini fallback."""
    tickers = {
        "^NSEI": "Nifty 50", "^BSESN": "Sensex", "^NSEBANK": "Bank Nifty",
        "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "Nasdaq",
        "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", "SOL-USD": "Solana",
        "INR=X": "USD/INR", "EURINR=X": "EUR/INR",
    }
    data: List[Dict] = []
    failed: List[str] = []

    for symbol, name in tickers.items():
        try:
            info  = yf.Ticker(symbol).fast_info
            price = info.last_price
            prev  = info.previous_close
            if price is None:
                raise ValueError("No price")
            change = price - prev
            data.append({
                "symbol": symbol,
                "name": name,
                "type": "CRYPTO" if "-USD" in symbol else "FOREX" if "=X" in symbol else "INDEX",
                "status": get_market_status(symbol),
                "price": price,
                "change": change,
                "change_percent": (change / prev) * 100 if prev else 0,
            })
        except:
            failed.append(symbol)

    if failed:
        ai_data = get_gemini_fallback("market_batch", failed)
        for symbol in failed:
            item = ai_data.get(symbol, {}) if ai_data else {}
            data.append({
                "symbol": symbol,
                "name": tickers[symbol],
                "type": "CRYPTO" if "-USD" in symbol else "FOREX" if "=X" in symbol else "INDEX",
                "status": get_market_status(symbol),
                "price": item.get("price", 0.0),
                "change": item.get("change", 0.0),
                "change_percent": item.get("change_percent", 0.0),
                "is_mock": not bool(item),
                "source": "AI_ESTIMATE" if item else "UNAVAILABLE",
            })

    return {"items": data, "status": "ok"}


@app.get("/api/py/news")
async def get_news():
    """Fetch news: Google News RSS → ET/MC RSS → Gemini → static fallback."""
    rss_sources = [
        ("Google News", "https://news.google.com/rss/search?q=indian+stock+market+nifty&hl=en-IN&gl=IN&ceid=IN:en"),
        ("Economic Times", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
        ("Moneycontrol", "https://www.moneycontrol.com/rss/MCtopnews.xml"),
    ]
    import xml.etree.ElementTree as ET
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    for source_name, rss_url in rss_sources:
        try:
            resp = requests.get(rss_url, headers=headers, timeout=6)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            items = []
            for item in root.findall(".//item")[:15]:
                title  = item.find("title")
                link   = item.find("link")
                pubdate= item.find("pubDate")
                source = item.find("source")
                items.append({
                    "title": title.text if title is not None else "News Update",
                    "publisher": (source.text if source is not None else source_name),
                    "link": link.text if link is not None else "#",
                    "providerPublishTime": int(time.time()),
                    "publishedAt": pubdate.text if pubdate is not None else "",
                    "type": "STORY",
                    "image": f"https://placehold.co/600x400/1e293b/ffffff?text=News",
                })
            if items:
                return {"items": items, "source": source_name}
        except:
            continue

    # Gemini fallback
    ai_news = get_gemini_fallback("news", "")
    if ai_news:
        return ai_news

    # Final static fallback
    now = int(time.time())
    return {"items": [
        {"title": "Nifty consolidates near key support; IT and Banking lead", "publisher": "Quantra", "link": "#", "providerPublishTime": now, "image": "https://placehold.co/600x400/1e293b/ffffff?text=Nifty"},
        {"title": "RBI maintains accommodative stance; markets react positively", "publisher": "Quantra", "link": "#", "providerPublishTime": now - 3600, "image": "https://placehold.co/600x400/1e293b/ffffff?text=RBI"},
        {"title": "FII buying resumes; Nifty targets 25,000 in near term", "publisher": "Quantra", "link": "#", "providerPublishTime": now - 7200, "image": "https://placehold.co/600x400/1e293b/ffffff?text=FII"},
    ]}


@app.post("/api/py/quote")
async def get_quote(request: QuoteRequest):
    """Get real-time stock quote with Gemini fallback."""
    load_ticker_map()
    query  = request.symbol.upper().strip()
    symbol = query

    if query in TICKER_MAP:
        symbol = TICKER_MAP[query]
    else:
        matches = [k for k in TICKER_NAMES if k.startswith(query)]
        if matches:
            matches.sort(key=len)
            symbol = TICKER_MAP[matches[0]]
        elif len(query) > 2:
            close = difflib.get_close_matches(query, TICKER_NAMES, n=1, cutoff=0.5)
            if close:
                symbol = TICKER_MAP[close[0]]

    if not any(x in symbol for x in [".NS", ".BO", "^", "-", "="]):
        symbol += ".NS"

    try:
        info  = yf.Ticker(symbol).fast_info
        price = info.last_price
        if price is None:
            raise ValueError("No price")
        prev = info.previous_close
        return {
            "symbol": symbol,
            "price": price,
            "change": price - prev,
            "change_percent": ((price - prev) / prev) * 100 if prev else 0,
            "day_high": info.day_high,
            "day_low":  info.day_low,
            "volume":   info.last_volume,
            "previous_close": prev,
            "currency": info.currency,
        }
    except:
        ai = get_gemini_fallback("quote", symbol)
        if ai:
            return ai
        import random
        mp = random.uniform(100, 3000)
        mc = random.uniform(-30, 30)
        return {
            "symbol": symbol,
            "price": mp,
            "change": mc,
            "change_percent": (mc / mp) * 100,
            "day_high": mp * 1.02,
            "day_low":  mp * 0.98,
            "volume":   random.randint(100_000, 5_000_000),
            "previous_close": mp - mc,
            "currency": "INR" if ".NS" in symbol else "USD",
            "source": "SYSTEM_MOCK",
        }


@app.post("/api/py/chat")
async def chat(request: ChatRequest):
    """
    Tenali AI chat — Gemini 2.0 Flash primary, Groq Llama-3.1-8B fallback.
    Powered by Quantra — India's intelligent trading platform.
    """
    market_context = get_market_context()
    ist = pytz.timezone("Asia/Kolkata")
    nse_status = is_nse_open(datetime.now(ist))

    system_prompt = f"""You are Tenali AI — the intelligent trading co-pilot of Quantra, India's premier financial intelligence platform for retail traders.

Your identity:
- You think like a senior quant analyst + experienced Indian trader combined
- You speak in clear, direct Hinglish — never use jargon without explaining it
- You have deep knowledge of NSE, BSE, Nifty, Bank Nifty, F&O, SEBI regulations
- You always give specific, actionable advice: entry price in ₹, stop loss in ₹, target in ₹
- You include position size guidance based on the 2% risk rule
- You are honest — if a setup is weak or a trade is risky, you say so clearly
- You never give generic global finance advice — everything is India-market specific

Current Market Context: {market_context}
NSE Market Status: {nse_status}

Rules:
1. Lead with the bottom line — give the insight first, explain second
2. Use Indian context: NSE/BSE tickers, ₹ currency, Indian regulations (SEBI)
3. Be specific with numbers and levels — no vague statements
4. Always mention risk — no trade setup without a stop-loss in ₹
5. Educational analysis only — always remind user to do their own research
6. Keep responses concise but data-rich — traders want signal, not noise
7. End responses with: "Ab andhere mein mat trade karo. Quantra ke saath system banao. 💡""""

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # Try Gemini first, fall back to Groq
    use_gemini = bool(GEMINI_API_KEY)
    use_groq   = bool(GROQ_API_KEY)

    if not use_gemini and not use_groq:
        async def no_llm():
            yield b"Tenali AI is currently unavailable — API keys not configured. Please check your Quantra backend environment variables."
        return StreamingResponse(no_llm(), media_type="text/plain")

    async def gemini_with_fallback():
        try:
            for chunk in _gemini_stream(messages, system_prompt):
                yield chunk.encode("utf-8")
        except Exception as e:
            err_str = str(e).lower()
            rate_limited = "429" in err_str or "quota" in err_str or "rate" in err_str
            if rate_limited and use_groq:
                # Silently switch to Groq
                for chunk in _groq_stream(messages, system_prompt):
                    yield chunk.encode("utf-8")
            else:
                if use_groq:
                    for chunk in _groq_stream(messages, system_prompt):
                        yield chunk.encode("utf-8")
                else:
                    yield b"Tenali AI encountered an error. Please try again in a moment."

    async def groq_only():
        for chunk in _groq_stream(messages, system_prompt):
            yield chunk.encode("utf-8")

    if use_gemini:
        return StreamingResponse(gemini_with_fallback(), media_type="text/plain")
    else:
        return StreamingResponse(groq_only(), media_type="text/plain")


@app.post("/api/py/journal-analysis")
async def journal_analysis(request: JournalAnalysisRequest):
    """
    Real AI analysis of trading journal using Gemini 2.0 Flash.
    Returns structured insights as JSON.
    """
    trades = request.trades
    if not trades:
        raise HTTPException(status_code=400, detail="No trades to analyze")

    if not GEMINI_API_KEY and not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="LLM not configured")

    # Build trade summary for the prompt
    closed  = [t for t in trades if t.get("net_pnl") is not None]
    winners = [t for t in closed if (t.get("net_pnl") or 0) > 0]
    losers  = [t for t in closed if (t.get("net_pnl") or 0) < 0]
    win_rate = (len(winners) / len(closed) * 100) if closed else 0
    total_pnl = sum(t.get("net_pnl") or 0 for t in closed)
    avg_win   = sum(t.get("net_pnl") or 0 for t in winners) / len(winners) if winners else 0
    avg_loss  = sum(t.get("net_pnl") or 0 for t in losers)  / len(losers)  if losers  else 0

    symbols   = [t.get("symbol", "") for t in trades]
    strategies= [t.get("strategy", "") for t in trades if t.get("strategy")]
    emotions  = [t.get("pre_trade_emotion", "") for t in trades if t.get("pre_trade_emotion")]

    trade_summary = f"""
Trading Journal Summary:
- Total trades: {len(trades)} ({len(closed)} closed)
- Win Rate: {win_rate:.1f}% ({len(winners)} wins, {len(losers)} losses)
- Total P&L: ₹{total_pnl:.2f}
- Avg Win: ₹{avg_win:.2f} | Avg Loss: ₹{avg_loss:.2f}
- Risk/Reward: {abs(avg_win/avg_loss):.2f}x (target: >1.5x)
- Most traded: {', '.join(list(set(symbols))[:5])}
- Strategies used: {', '.join(list(set(strategies))[:5]) or 'Not specified'}
- Dominant emotions: {', '.join(list(set(emotions))[:5]) or 'Not specified'}

Recent trades (last 5):
{json.dumps(trades[:5], indent=2, default=str)}
"""

    prompt = f"""You are Tenali, an expert trading coach. Analyze this trader's journal:

{trade_summary}

Provide analysis in this EXACT JSON format (no markdown wrapping):
{{
  "summary": "2-3 sentence overall performance summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "patterns": ["pattern detected 1", "pattern detected 2"],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "risk_score": "Low/Medium/High",
  "key_metric": "one most important number to focus on improving"
}}

Be specific to their actual data. Reference real numbers. Be direct and practical."""

    try:
        if GEMINI_API_KEY:
            text = _gemini_generate(prompt)
        else:
            # Use Groq non-streaming
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 800,
                "temperature": 0.5,
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=20)
            text = resp.json()["choices"][0]["message"]["content"]

        # Parse JSON from response
        clean = text.strip().replace("```json", "").replace("```", "").strip()
        # Find the JSON object
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]
        result = json.loads(clean)
        return result

    except Exception as e:
        print(f"Journal analysis error: {e}")
        # Return structured fallback
        return {
            "summary": f"You have completed {len(closed)} trades with a {win_rate:.1f}% win rate and total P&L of ₹{total_pnl:.2f}.",
            "strengths": ["You are actively tracking your trades — first step to improvement"],
            "weaknesses": ["Analysis service temporarily unavailable — try again"],
            "patterns": [],
            "recommendations": ["Continue journaling consistently", "Review your stop-loss discipline"],
            "risk_score": "Medium",
            "key_metric": f"Win Rate: {win_rate:.1f}%",
        }


@app.get("/api/py/health")
async def health():
    return {
        "status": "ok",
        "gemini": bool(GEMINI_API_KEY),
        "groq": bool(GROQ_API_KEY),
        "timestamp": datetime.now(pytz.timezone("Asia/Kolkata")).isoformat(),
    }


# ── Trade Scanner ─────────────────────────────────────────────────────────────
@app.get("/api/py/scanner")
async def scanner(type: str = "swing"):
    """Run trade scanner for a given type: intraday | swing | longterm"""
    if type not in ("intraday", "swing", "longterm"):
        raise HTTPException(status_code=400, detail="type must be intraday, swing, or longterm")
    if _run_scan is None:
        raise HTTPException(status_code=503, detail="Scanner module not available")
    try:
        result = _run_scan(type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
