"""
Tenali LLM Cloud API (Lightweight)
Uses HuggingFace Inference API instead of local model for free cloud deployment.
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import json
import asyncio
from typing import List, Dict, Optional
import yfinance as yf
from datetime import datetime
import pytz
import pandas as pd
import io
import difflib

app = FastAPI(
    title="Tenali LLM Cloud API",
    description="Financial AI Assistant API (Cloud Mode)",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
HF_TOKEN = os.getenv("HF_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct"

if not HF_TOKEN:
    print("WARNING: HF_TOKEN environment variable not set. AI features will fail.")

# Request models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[Dict] = {}
    stream: bool = True
    max_tokens: int = 1024
    temperature: float = 0.7

class PortfolioRequest(BaseModel):
    holdings: List[Dict]

class QuoteRequest(BaseModel):
    symbol: str

# -----------------------------------------------------------------------------
# MARKET DATA FUNCTIONS (Same as local api.py)
# -----------------------------------------------------------------------------

market_cache = {"data": "", "timestamp": 0}

def get_market_context():
    global market_cache
    import time
    current_time = time.time()
    if current_time - market_cache["timestamp"] < 300 and market_cache["data"]:
        return market_cache["data"]

    try:
        tickers = {"^NSEI": "Nifty 50", "^NSEBANK": "Bank Nifty", "INR=X": "USD/INR"}
        data_text = [f"Date: {datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%d-%b %H:%M')}"]
        
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
            except: continue
                
        result = " | ".join(data_text)
        market_cache["data"] = result
        market_cache["timestamp"] = current_time
        return result
    except: return market_cache["data"]

# NSE Ticker Map
TICKER_MAP = {}
TICKER_NAMES = []

@app.on_event("startup")
def load_ticker_map():
    global TICKER_MAP, TICKER_NAMES
    try:
        print("Loading NSE Ticker Map...")
        url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            df = pd.read_csv(io.StringIO(response.text))
            for _, row in df.iterrows():
                symbol = f"{row['SYMBOL']}.NS"
                TICKER_MAP[row['NAME OF COMPANY'].upper()] = symbol
                TICKER_MAP[row['SYMBOL'].upper()] = symbol
            TICKER_NAMES = list(TICKER_MAP.keys())
            print(f"Loaded {len(TICKER_MAP)} tickers.")
    except Exception as e:
        print(f"Error loading ticker map: {e}")

def get_stock_context(message: str) -> str:
    # Simplified for cloud: just check for explicit mentions if needed
    # For now, relying on system prompt context injection
    return ""

# -----------------------------------------------------------------------------
# API ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"status": "running", "mode": "cloud", "model": "Qwen2.5-1.5B-Instruct (via HF API)"}

@app.post("/quote")
async def get_quote(request: QuoteRequest):
    try:
        query = request.symbol.upper().strip()
        symbol = query
        
        if query in ["BTC", "ETH", "SOL", "ADA", "XRP", "DOGE"]:
            symbol = f"{query}-USD"
        elif query in TICKER_MAP:
            symbol = TICKER_MAP[query]
        elif len(query) > 2 and TICKER_NAMES:
            matches = difflib.get_close_matches(query, TICKER_NAMES, n=1, cutoff=0.4)
            if matches: symbol = TICKER_MAP[matches[0]]
        
        if not any(x in symbol for x in [".NS", ".BO", "^", "-"]):
            if len(symbol) < 10: symbol += ".NS"
            
        info = yf.Ticker(symbol).fast_info
        price = info.last_price
        if price is None: raise ValueError("No price data")
        
        return {
            "symbol": symbol,
            "price": price,
            "change": price - info.previous_close,
            "change_percent": ((price - info.previous_close) / info.previous_close) * 100,
            "day_high": info.day_high,
            "day_low": info.day_low,
            "volume": info.last_volume,
            "previous_close": info.previous_close
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        market_context = get_market_context()
        user_message = next((m.content for m in request.messages if m.role == "user"), "")
        
        # Construct System Prompt
        system_prompt = f"""Role: Chief Investment Officer (CIO).
Context: {market_context}
Objective: Provide institutional-grade financial analysis.
Rules:
1. Bottom Line First.
2. Data-Backed Claims.
3. Indian Context (NSE/BSE).
"""
        
        # Format for HF API (Qwen uses ChatML format usually, but we send raw string or formatted prompt)
        # HF Inference API for text-generation models expects a single string prompt
        formatted_prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        for m in request.messages:
            if m.role != "system":
                formatted_prompt += f"<|im_start|>{m.role}\n{m.content}<|im_end|>\n"
        formatted_prompt += "<|im_start|>assistant\n"

        if request.stream:
            return StreamingResponse(stream_hf_response(formatted_prompt), media_type="text/plain")
        else:
            response = await query_hf_api(formatted_prompt)
            return {"response": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def query_hf_api(prompt):
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 1024, "return_full_text": False, "temperature": 0.7}
    }
    response = requests.post(HF_API_URL, headers={"Authorization": f"Bearer {HF_TOKEN}"}, json=payload)
    return response.json()[0]["generated_text"]

async def stream_hf_response(prompt):
    # HF Inference API doesn't support true streaming easily via requests, 
    # but we can simulate it or just wait. 
    # For true streaming we need 'stream': True in payload and handle SSE.
    
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 1024, "return_full_text": False, "temperature": 0.7},
        "stream": True
    }
    
    try:
        with requests.post(HF_API_URL, headers={"Authorization": f"Bearer {HF_TOKEN}"}, json=payload, stream=True) as r:
            for line in r.iter_lines():
                if line:
                    # HF stream format: data: {"token": {"text": "..."}}
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data:"):
                        try:
                            json_data = json.loads(decoded_line[5:])
                            if "token" in json_data:
                                yield json_data["token"]["text"].encode()
                        except: pass
    except Exception as e:
        yield f"Error: {str(e)}".encode()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
