from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Literal, Dict, List
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import os, json

app = FastAPI(title="Mock Bank Reciever", version="0.1.0")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "transactions.jsonl")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

class Transaction(BaseModel):
    id: str
    account:str
    amount: float
    timestamp: datetime
    type: Literal["credit", "debit"]

def read_transactions() -> List[Dict]:
    """Read all transactions from the JSONL file"""
    transactions = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    transactions.append(json.loads(line))
    return transactions

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main dashboard page"""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Dashboard not found. Please ensure static files are present.</h1>")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/transactions", status_code=201)
async def recieve_transaction(tx: Transaction):
    """Receive and store a transaction"""
    os.makedirs(DATA_DIR, exist_ok=True)
    record = tx.model_dump()
    record["timestamp"] = tx.timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    with open(DATA_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    return {"status": "accepted", "id": tx.id}

@app.get("/api/analytics/summary")
async def get_summary():
    """Get overall transaction summary statistics"""
    transactions = read_transactions()
    
    if not transactions:
        return {
            "total_transactions": 0,
            "total_credits": 0,
            "total_debits": 0,
            "net_balance": 0,
            "average_transaction": 0,
            "unique_accounts": 0
        }
    
    total_credits = sum(tx["amount"] for tx in transactions if tx["type"] == "credit")
    total_debits = sum(tx["amount"] for tx in transactions if tx["type"] == "debit")
    accounts = set(tx["account"] for tx in transactions)
    
    return {
        "total_transactions": len(transactions),
        "total_credits": round(total_credits, 2),
        "total_debits": round(total_debits, 2),
        "net_balance": round(total_credits - total_debits, 2),
        "average_transaction": round(sum(tx["amount"] for tx in transactions) / len(transactions), 2),
        "unique_accounts": len(accounts)
    }

@app.get("/api/analytics/by-account")
async def get_by_account():
    """Get transaction analytics grouped by account"""
    transactions = read_transactions()
    
    accounts_data = defaultdict(lambda: {"credits": 0, "debits": 0, "count": 0, "balance": 0})
    
    for tx in transactions:
        account = tx["account"]
        amount = tx["amount"]
        accounts_data[account]["count"] += 1
        
        if tx["type"] == "credit":
            accounts_data[account]["credits"] += amount
            accounts_data[account]["balance"] += amount
        else:
            accounts_data[account]["debits"] += amount
            accounts_data[account]["balance"] -= amount
    
    result = []
    for account, data in accounts_data.items():
        result.append({
            "account": account,
            "credits": round(data["credits"], 2),
            "debits": round(data["debits"], 2),
            "balance": round(data["balance"], 2),
            "count": data["count"]
        })
    
    return sorted(result, key=lambda x: x["balance"], reverse=True)

@app.get("/api/analytics/timeline")
async def get_timeline():
    """Get transaction timeline data (hourly aggregation)"""
    transactions = read_transactions()
    
    if not transactions:
        return []
    timeline = defaultdict(lambda: {"credits": 0, "debits": 0, "count": 0})
    for tx in transactions:
        # Parse timestamp and round to hour
        dt = datetime.fromisoformat(tx["timestamp"].replace("Z", "+00:00"))
        hour_key = dt.strftime("%Y-%m-%d %H:00")
        timeline[hour_key]["count"] += 1
        if tx["type"] == "credit":
            timeline[hour_key]["credits"] += tx["amount"]
        else:
            timeline[hour_key]["debits"] += tx["amount"]
    
    result = []
    for timestamp, data in sorted(timeline.items()):
        result.append({
            "timestamp": timestamp,
            "credits": round(data["credits"], 2),
            "debits": round(data["debits"], 2),
            "count": data["count"]
        })
    
    return result

@app.get("/api/analytics/recent")
async def get_recent(limit: int = 10):
    """Get most recent transactions"""
    transactions = read_transactions()
    
    # Sort by timestamp descending
    sorted_txs = sorted(transactions, key=lambda x: x["timestamp"], reverse=True)
    
    return sorted_txs[:limit]

@app.get("/api/analytics/type-distribution")
async def get_type_distribution():
    """Get distribution of transaction types"""
    transactions = read_transactions()
    
    credits = sum(1 for tx in transactions if tx["type"] == "credit")
    debits = sum(1 for tx in transactions if tx["type"] == "debit")
    
    return {
        "credit": credits,
        "debit": debits
    }

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")