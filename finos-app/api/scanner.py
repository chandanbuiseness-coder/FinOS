"""
FinOS Trade Scanner — Algorithm Suite (Nifty 500 Universe)
"""
import yfinance as yf
import pandas as pd
import pytz
import time
from datetime import datetime, date
from typing import List, Dict

# ── Nifty 500 Universe (curated, 200+ liquid stocks) ──────────────────────────
NIFTY500 = [
    # ── Large Cap / Nifty 50 ──────────────────────────────────────────────────
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","BHARTIARTL.NS","ICICIBANK.NS",
    "INFY.NS","SBIN.NS","ITC.NS","HINDUNILVR.NS","LT.NS",
    "KOTAKBANK.NS","AXISBANK.NS","MARUTI.NS","WIPRO.NS","SUNPHARMA.NS",
    "ULTRACEMCO.NS","TITAN.NS","BAJFINANCE.NS","ASIANPAINT.NS","TATAMOTORS.NS",
    "M&M.NS","HCLTECH.NS","TECHM.NS","INDUSINDBK.NS","BAJAJFINSV.NS",
    "ADANIPORTS.NS","NTPC.NS","POWERGRID.NS","COALINDIA.NS","ONGC.NS",
    "BPCL.NS","GRASIM.NS","TATASTEEL.NS","HINDALCO.NS","DRREDDY.NS",
    "CIPLA.NS","APOLLOHOSP.NS","JSWSTEEL.NS","EICHERMOT.NS","HEROMOTOCO.NS",
    "BRITANNIA.NS","NESTLEIND.NS","TATACONSUM.NS","ZOMATO.NS","ADANIENT.NS",
    "BEL.NS","TATAPOWER.NS","LICI.NS","BAJAJ-AUTO.NS","SHRIRAMFIN.NS",
    # ── IT / Tech ─────────────────────────────────────────────────────────────
    "LTIM.NS","PERSISTENT.NS","COFORGE.NS","MPHASIS.NS","TATAELXSI.NS",
    "KPITTECH.NS","TATATECH.NS","OFSS.NS","HEXAWARE.NS","CYIENT.NS",
    "TANLA.NS","LATENTVIEW.NS","ROUTE.NS","HAPPSTMNDS.NS","BIRLASOFT.NS",
    # ── Banking / NBFC ────────────────────────────────────────────────────────
    "BANKBARODA.NS","PNB.NS","CANBK.NS","FEDERALBNK.NS","IDFCFIRSTB.NS",
    "BANDHANBNK.NS","AUBANK.NS","KARURVYSYA.NS","RBLBANK.NS","DCBBANK.NS",
    "CHOLAFIN.NS","M&MFIN.NS","LICHSGFIN.NS","RECLTD.NS","PFC.NS","IRFC.NS",
    "MUTHOOTFIN.NS","MANAPPURAM.NS","BAJAJHLDNG.NS","SBICARD.NS",
    "HDFCAMC.NS","NIPPONLIFE.NS","ICICIGI.NS","ICICIPRULI.NS",
    "SBILIFE.NS","HDFCLIFE.NS","MFSL.NS","STAR.NS",
    # ── Pharma / Healthcare ────────────────────────────────────────────────────
    "LUPIN.NS","BIOCON.NS","ALKEM.NS","TORNTPHARM.NS","AUROPHARMA.NS",
    "DIVISLAB.NS","ABBOTINDIA.NS","PFIZER.NS","SANOFI.NS","GLENMARK.NS",
    "IPCALAB.NS","NATCOPHARM.NS","LAURUSLABS.NS","GRANULES.NS","AJANTPHARM.NS",
    "METROPOLIS.NS","LALPATHLAB.NS","THYROCARE.NS","MAXHEALTH.NS","FORTIS.NS",
    "APOLLOHOSP.NS","NARAYANAHLT.NS","MEDANTA.NS","ASTER.NS",
    # ── FMCG / Consumer ───────────────────────────────────────────────────────
    "GODREJCP.NS","DABUR.NS","MARICO.NS","COLPAL.NS","EMAMILTD.NS",
    "TATACONSUM.NS","VBL.NS","RADICO.NS","UNITDSPR.NS","MCDOWELL-N.NS",
    "JUBLFOOD.NS","WESTLIFE.NS","DEVYANI.NS","SAPPHIRE.NS",
    # ── Auto / Auto Ancillary ─────────────────────────────────────────────────
    "MRF.NS","BALKRISIND.NS","APOLLOTYRE.NS","CEAT.NS","MOTHERSON.NS",
    "BOSCHLTD.NS","BHARATFORG.NS","SUNDRMFAST.NS","BHARAT-ELEC.NS",
    "TVSMOTOR.NS","EIHOTEL.NS","ESCORT.NS","CRAFTSMAN.NS","SUPRAJIT.NS",
    # ── Capital Goods / Industrials ──────────────────────────────────────────
    "SIEMENS.NS","ABB.NS","HAVELLS.NS","CUMMINSIND.NS","THERMAX.NS",
    "BHEL.NS","BHARAT-ELEC.NS","BEML.NS","GRINDWELL.NS","CARBORUNIV.NS",
    "VOLTAS.NS","BLUESTARCO.NS","WHIRLPOOL.NS","DIXON.NS","AMBER.NS",
    "POLYCAB.NS","KEI.NS","FINOLEX.NS",
    # ── Cement / Construction ─────────────────────────────────────────────────
    "JKCEMENT.NS","RAMCOCEM.NS","HEIDELBERG.NS","NUVOCO.NS","SANGHI.NS",
    "OBEROIRLTY.NS","DLF.NS","GODREJPROP.NS","PRESTIGE.NS","BRIGADE.NS",
    "SOBHA.NS","MAHLIFE.NS","PHOENIXLTD.NS",
    # ── Energy / Oil & Gas ────────────────────────────────────────────────────
    "GAIL.NS","IGL.NS","MGL.NS","PETRONET.NS","HINDPETRO.NS",
    "ADANIGREEN.NS","TORNTPOWER.NS","CESC.NS","TATAPOWER.NS",
    "NHPC.NS","SJVN.NS","IREDA.NS",
    # ── Chemicals / Specialty ─────────────────────────────────────────────────
    "PIIND.NS","DEEPAKNTR.NS","SRF.NS","VINATIORGA.NS","NAVINFLUOR.NS",
    "ASTEC.NS","AARTI.NS","AARTIIND.NS","ALKYLAMINE.NS","CLEAN.NS",
    "FLUOROCHEM.NS","JUBLINDS.NS","BALAMINES.NS","NEOGEN.NS",
    # ── Metals / Mining ──────────────────────────────────────────────────────
    "SAIL.NS","NATIONALUM.NS","VEDL.NS","HINDZINC.NS","WELCORP.NS",
    "APLAPOLLO.NS","RATNAMANI.NS","GPPL.NS",
    # ── Infrastructure / Logistics ────────────────────────────────────────────
    "IRCTC.NS","CONCOR.NS","BLUEDART.NS","GMRINFRA.NS","IRB.NS",
    "ADANIPORTS.NS","GATEWAY.NS","DELHIVERY.NS","MAHINDRA.NS",
    # ── Telecom / Media ───────────────────────────────────────────────────────
    "TATACOMM.NS","INDIAMART.NS","NAUKRI.NS","JUSTDIAL.NS","ZOMATO.NS",
    "PAYTM.NS","POLICYBZR.NS","DMART.NS","MEDPLUS.NS",
    # ── Paints / Lifestyle ───────────────────────────────────────────────────
    "BERGEPAINT.NS","KANSAINER.NS","INDIGOPNTS.NS","ASTRAL.NS","PIDILITIND.NS",
    "TITAN.NS","KALYANKJIL.NS","MANYAVAR.NS","SKFINDIA.NS",
]

# De-duplicate
NIFTY500 = list(dict.fromkeys(NIFTY500))

# Batches: scan in chunks to avoid timeout; cached per day
_scan_cache: Dict = {}

# ── Timeout guard ─────────────────────────────────────────────────────────────
class TimeoutStop(Exception):
    pass

# ── Indicators ────────────────────────────────────────────────────────────────
def calc_rsi(s: pd.Series, p: int = 14) -> pd.Series:
    d = s.diff()
    g = d.clip(lower=0).rolling(p).mean()
    l = (-d.clip(upper=0)).rolling(p).mean()
    return 100 - (100 / (1 + g / (l + 1e-10)))

def calc_atr(h, l, c, p: int = 14) -> pd.Series:
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    return tr.rolling(p).mean()

def calc_ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def calc_bb(s: pd.Series, p: int = 20, std: float = 2.0):
    m = s.rolling(p).mean(); d = s.rolling(p).std()
    return m + std * d, m, m - std * d

def calc_keltner(h, l, c, p: int = 20, mult: float = 1.5):
    m = calc_ema(c, p); a = calc_atr(h, l, c, p)
    return m + mult * a, m, m - mult * a

def _clean(sym: str) -> str:
    return sym.replace(".NS", "").replace(".BO", "")

# ── Batch download with chunk splitting ─────────────────────────────────────
def _batch(symbols: List[str], period: str = "1y", chunk: int = 50) -> Dict[str, pd.DataFrame]:
    """Download symbols in chunks and merge. Returns {sym: OHLCV df}."""
    result: Dict[str, pd.DataFrame] = {}
    for i in range(0, len(symbols), chunk):
        batch = symbols[i: i + chunk]
        try:
            raw = yf.download(batch, period=period, interval="1d",
                              auto_adjust=True, progress=False, threads=True)
            if isinstance(raw.columns, pd.MultiIndex):
                for sym in batch:
                    try:
                        df = raw.xs(sym, axis=1, level=1).dropna(how="all")
                        if len(df) > 5:
                            result[sym] = df
                    except Exception:
                        pass
            else:
                if len(batch) == 1 and len(raw) > 5:
                    result[batch[0]] = raw.dropna(how="all")
        except Exception:
            pass
    return result

# ── Algorithms ─────────────────────────────────────────────────────────────────
def _52w_signals(dfs: Dict) -> List[Dict]:
    out = []
    for sym, df in dfs.items():
        try:
            c, v, h, l = df["Close"], df["Volume"], df["High"], df["Low"]
            if len(c) < 100: continue
            hi52 = c.max(); cur = float(c.iloc[-1])
            avg_v = float(v.rolling(20).mean().iloc[-1])
            cur_v = float(v.iloc[-1])
            pct = (cur - hi52) / hi52 * 100
            if -3.5 <= pct <= 0.5 and cur_v > avg_v * 1.4:
                atr_v = float(calc_atr(h, l, c).iloc[-1])
                conf = min(93, int(65 + min(25, (cur_v / avg_v - 1.4) * 18)))
                out.append(build(sym, "52W High Breakout", "swing", "BUY",
                    cur, cur * 0.92, cur * 1.10, cur * 1.20, conf,
                    "Swing (2-6 weeks)", f"Within {abs(pct):.1f}% of 52W high. Vol {cur_v/avg_v:.1f}x.",
                    "1:1.4", ["Momentum", "Breakout"]))
        except Exception: pass
    return out

def _rsi_signals(dfs: Dict) -> List[Dict]:
    out = []
    for sym, df in dfs.items():
        try:
            c, v, h, l = df["Close"], df["Volume"], df["High"], df["Low"]
            if len(c) < 60: continue
            rsi = calc_rsi(c)
            cur, pr, cr = float(c.iloc[-1]), float(rsi.iloc[-2]), float(rsi.iloc[-1])
            d200 = float(c.rolling(200).mean().iloc[-1]) if len(c) >= 200 else cur * 0.9
            atr_v = float(calc_atr(h, l, c).iloc[-1])
            avg_v = float(v.rolling(20).mean().iloc[-1]); cur_v = float(v.iloc[-1])
            if pr < 35 and cr > pr + 1 and cur > d200 * 0.98 and cur_v > avg_v:
                conf = min(88, int(55 + (35 - pr) * 2 + (cur_v / avg_v - 1) * 5))
                out.append(build(sym, "RSI Oversold Bounce", "swing", "BUY",
                    cur, cur - 2 * atr_v, cur + 3 * atr_v, cur + 5 * atr_v, conf,
                    "Swing (1-3 weeks)", f"RSI {pr:.0f}→{cr:.0f}. Above 200DMA.",
                    "1:1.5", ["RSI", "Mean Reversion"]))
        except Exception: pass
    return out

def _ema_signals(dfs: Dict) -> List[Dict]:
    out = []
    for sym, df in dfs.items():
        try:
            c, v, h, l = df["Close"], df["Volume"], df["High"], df["Low"]
            if len(c) < 25: continue
            e9, e21 = calc_ema(c, 9), calc_ema(c, 21)
            cur = float(c.iloc[-1]); atr_v = float(calc_atr(h, l, c).iloc[-1])
            avg_v = float(v.rolling(20).mean().iloc[-1]); cur_v = float(v.iloc[-1])
            bull = float(e9.iloc[-2]) <= float(e21.iloc[-2]) and float(e9.iloc[-1]) > float(e21.iloc[-1])
            bear = float(e9.iloc[-2]) >= float(e21.iloc[-2]) and float(e9.iloc[-1]) < float(e21.iloc[-1])
            if bull or bear:
                sig = "BUY" if bull else "SELL"; m = 1 if bull else -1
                conf = min(85, int(60 + (cur_v / avg_v - 1) * 10))
                out.append(build(sym, "EMA 9/21 Crossover", "swing", sig,
                    cur, cur - m * 1.5 * atr_v, cur + m * 2.5 * atr_v, cur + m * 4 * atr_v,
                    conf, "Swing (5-15 days)",
                    f"EMA9 {'above' if bull else 'below'} EMA21. Vol {cur_v/avg_v:.1f}x.", "1:1.7",
                    ["Trend", "EMA Crossover"]))
        except Exception: pass
    return out

def _bb_signals(dfs: Dict) -> List[Dict]:
    out = []
    for sym, df in dfs.items():
        try:
            c, h, l = df["Close"], df["High"], df["Low"]
            if len(c) < 30: continue
            bbu, _, bbl = calc_bb(c)
            kcu, _, kcl = calc_keltner(h, l, c)
            sq_on  = float(bbu.iloc[-1]) < float(kcu.iloc[-1]) and float(bbl.iloc[-1]) > float(kcl.iloc[-1])
            sq_off = (float(bbu.iloc[-2]) < float(kcu.iloc[-2]) and
                      float(bbl.iloc[-2]) > float(kcl.iloc[-2])) and not sq_on
            if sq_on or sq_off:
                cur = float(c.iloc[-1]); mom = (cur - float(c.iloc[-5])) / float(c.iloc[-5]) * 100
                sig = "BUY" if mom >= 0 else "SELL"; m = 1 if mom >= 0 else -1
                atr_v = float(calc_atr(h, l, c).iloc[-1])
                conf = 78 if sq_off else 66
                out.append(build(sym, "BB Squeeze (TTM)", "swing", sig,
                    cur, cur - m * 1.5 * atr_v, cur + m * 3 * atr_v, cur + m * 5 * atr_v,
                    conf, "Swing (2-4 weeks)",
                    f"{'Squeeze released!' if sq_off else 'Coiling.'} Mom {mom:+.1f}% (5d).",
                    "1:2", ["Squeeze", "Volatility"]))
        except Exception: pass
    return out

def _supertrend_signals(dfs: Dict) -> List[Dict]:
    out = []
    for sym, df in dfs.items():
        try:
            c, h, l, v = df["Close"], df["High"], df["Low"], df["Volume"]
            if len(c) < 30: continue
            atr14 = calc_atr(h, l, c, 10); hl2 = (h + l) / 2
            lb = hl2 - 3 * atr14
            e9, e21 = calc_ema(c, 9), calc_ema(c, 21)
            cur = float(c.iloc[-1]); st_up = float(lb.iloc[-1])
            bull = cur > st_up and float(c.iloc[-2]) > float(lb.iloc[-2])
            ema_bull = float(e9.iloc[-1]) > float(e21.iloc[-1])
            avg_v = float(v.rolling(20).mean().iloc[-1]); cur_v = float(v.iloc[-1])
            if bull and ema_bull and cur_v > avg_v:
                atr_v = float(atr14.iloc[-1])
                conf = min(82, int(68 + (cur_v / avg_v - 1) * 8))
                out.append(build(sym, "Supertrend + EMA", "intraday", "BUY",
                    cur, st_up * 0.998, cur + 2 * atr_v, cur + 3.5 * atr_v,
                    conf, "Intraday / Positional",
                    f"Supertrend bullish. EMA9>EMA21. Vol {cur_v/avg_v:.1f}x.", "1:2",
                    ["Supertrend", "Trend"]))
        except Exception: pass
    return out

def _orb_signals() -> List[Dict]:
    out = []
    for sym in NIFTY500[:20]:  # intraday: scan top liquid stocks only
        try:
            df = yf.Ticker(sym).history(period="2d", interval="5m")
            if len(df) < 6: continue
            or_data = df.iloc[-12:-9] if len(df) > 12 else df.iloc[:3]
            rest    = df.iloc[-9:]    if len(df) > 12 else df.iloc[3:]
            if len(or_data) < 2 or len(rest) == 0: continue
            orh, orl = float(or_data["High"].max()), float(or_data["Low"].min())
            cur, rng = float(rest["Close"].iloc[-1]), orh - orl
            avg_v, cur_v = float(df["Volume"].mean()), float(rest["Volume"].mean())
            if rng <= 0: continue
            if cur > orh * 1.001 and cur_v > avg_v * 1.2:
                out.append(build(sym, "Opening Range Breakout", "intraday", "BUY",
                    orh, orl, orh + rng * 1.5, orh + rng * 2.5,
                    73, "Intraday", f"ORB high {orh:.0f} | Range {rng:.0f}pts | Vol {cur_v/avg_v:.1f}x.",
                    "1:1.5", ["ORB", "Breakout"]))
            elif cur < orl * 0.999 and cur_v > avg_v * 1.2:
                out.append(build(sym, "Opening Range Breakout", "intraday", "SHORT",
                    orl, orh, orl - rng * 1.5, orl - rng * 2.5,
                    70, "Intraday", f"ORB breakdown {orl:.0f} | Range {rng:.0f}pts | Vol {cur_v/avg_v:.1f}x.",
                    "1:1.5", ["ORB", "Breakdown"]))
        except Exception: pass
    return out

def _quality_value_signals() -> List[Dict]:
    out = []
    for sym in NIFTY500[:30]:  # fundamental: slow, limit to top 30
        try:
            info = yf.Ticker(sym).info
            if not info: continue
            roe  = (info.get("returnOnEquity", 0) or 0) * 100
            de   = info.get("debtToEquity", 999) or 999
            pe   = info.get("trailingPE", 0) or 0
            fpe  = info.get("forwardPE", 0) or 0
            eg   = (info.get("earningsGrowth", 0) or 0) * 100
            rg   = (info.get("revenueGrowth", 0) or 0) * 100
            dy   = (info.get("dividendYield", 0) or 0) * 100
            price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            if not (roe > 15 and de < 100 and pe > 0 and price > 0): continue
            score = 0
            if roe > 20: score += 20
            elif roe > 15: score += 12
            if de < 30: score += 20
            elif de < 60: score += 12
            if fpe > 0 and fpe < pe: score += 15
            if eg > 15: score += 15
            elif eg > 10: score += 8
            if rg > 10: score += 10
            if dy > 1.5: score += 10
            if score >= 45:
                out.append(build(sym, "Quality Value Score", "longterm", "ACCUMULATE",
                    float(price), float(price) * 0.85, float(price) * 1.20, float(price) * 1.40,
                    min(90, score), "Long-term (3-12 months)",
                    f"ROE {roe:.0f}% | D/E {de:.0f} | EPS growth {eg:+.0f}% | Score {score}/100",
                    "1:3", ["Quality", "Value", "Fundamental"]))
        except Exception: pass
    return out

# ── Signal builder ────────────────────────────────────────────────────────────
def build(sym, algo, algo_type, signal, entry, sl, t1, t2, conf, tf, detail, rr, tags):
    return {
        "symbol": _clean(sym), "algorithm": algo, "algo_type": algo_type,
        "signal": signal,
        "entry": round(float(entry), 1), "stop_loss": round(float(sl), 1),
        "target_1": round(float(t1), 1), "target_2": round(float(t2), 1),
        "confidence": int(conf), "timeframe": tf, "detail": detail,
        "risk_reward": rr, "tags": tags,
    }

# ── Master scanner with intelligent batching + caching ───────────────────────
def run_scan(scan_type: str) -> Dict:
    key = f"{scan_type}_{date.today().isoformat()}"
    if key in _scan_cache and (time.time() - _scan_cache[key]["t"]) < 900:
        return _scan_cache[key]["d"]

    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)
    signals: List[Dict] = []

    if scan_type == "intraday":
        # Intraday: Supertrend on EOD data + ORB on 5m data
        dfs_3m = _batch(NIFTY500[:80], "3mo", chunk=40)
        signals += _supertrend_signals(dfs_3m)
        signals += _orb_signals()

    elif scan_type == "swing":
        # Swing: fetch 1y daily data in two chunks → run all 4 algos
        chunk1 = _batch(NIFTY500[:100], "1y", chunk=50)
        chunk2 = _batch(NIFTY500[100:200], "1y", chunk=50)
        all_dfs = {**chunk1, **chunk2}
        signals += _52w_signals(all_dfs)
        signals += _rsi_signals(all_dfs)
        signals += _ema_signals(all_dfs)
        signals += _bb_signals(all_dfs)

    elif scan_type == "longterm":
        # Long-term: fundamental data (slow per ticker), limit universe
        signals += _quality_value_signals()

    # Deduplicate by symbol+algo, sort by confidence
    seen = set()
    unique = []
    for s in signals:
        k = (s["symbol"], s["algorithm"])
        if k not in seen:
            seen.add(k)
            unique.append(s)
    unique.sort(key=lambda x: x["confidence"], reverse=True)

    result = {
        "scan_type": scan_type,
        "signals": unique,
        "count": len(unique),
        "universe": len(NIFTY500),
        "scanned_at": now.isoformat(),
        "market_note": "Live data via yFinance. Nifty 500 universe. Educational purposes only.",
    }
    _scan_cache[key] = {"t": time.time(), "d": result}
    return result
