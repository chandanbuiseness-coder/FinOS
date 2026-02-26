
import os
import json
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from data_collection.market_flows_collector import get_live_market_context

app = FastAPI(title="Quantra AI Engine")

class ChatRequest(BaseModel):
    message: str
    context: dict = {}

@app.get("/")
def home():
    return {
        "status": "Quantra AI Engine Live", 
        "model": "quantra-ai",
        "features": ["Live Market Context", "Exclusive Local Inference"]
    }

@app.post("/chat")
async def chat(request: ChatRequest):
    message = request.message
    
    # FETCH LIVE CONTEXT (FII/DII, PCR, Latest Prices)
    try:
        live_ctx = get_live_market_context()
    except Exception as e:
        print(f"Error fetching live context: {e}")
        live_ctx = {"timestamp": "Unknown", "error": str(e)}

    context_string = (
        f"LIVE MARKET STATE ({live_ctx.get('timestamp', 'N/A')}):\n"
        f"- Nifty: ₹{live_ctx.get('nifty_price', 'N/A')} ({live_ctx.get('nifty_change', '0')}%)\n"
        f"- Bank Nifty: ₹{live_ctx.get('banknifty_price', 'N/A')} ({live_ctx.get('banknifty_change', '0')}%)\n"
        f"- FII Activity: {live_ctx.get('fii_flow', 'N/A')}\n"
        f"- DII Activity: {live_ctx.get('dii_flow', 'N/A')}\n"
        f"- Nifty PCR: {live_ctx.get('nifty_pcr', 'N/A')} (Max Pain: {live_ctx.get('max_pain', 'N/A')})\n"
    )

    # EXCLUSIVE LOCAL OLLAMA INFERENCE (Quantra AI)
    try:
        ollama_url = "http://localhost:11434/api/generate"
        full_prompt = f"{context_string}\n\nUser Question: {message}"
        
        ollama_resp = requests.post(ollama_url, json={
            "model": "quantra-ai",
            "prompt": full_prompt,
            "stream": False,
            "system": "You are Quantra AI, the intelligent trading co-pilot. Use the 'LIVE MARKET STATE' context provided to ground your answer in current reality."
        }, timeout=45)
        
        if ollama_resp.status_code == 200:
            return {
                "response": ollama_resp.json().get('response', ""),
                "context_used": live_ctx,
                "engine": "quantra-local-llm"
            }
        else:
            raise HTTPException(status_code=500, detail=f"Ollama Error: {ollama_resp.text}")

    except Exception as e:
        return {
            "error": "Local AI Engine offline.",
            "detail": str(e),
            "fallback_context": live_ctx
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
