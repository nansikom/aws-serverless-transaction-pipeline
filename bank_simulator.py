import argparse, random, requests, time, uuid
from datetime import datetime, timezone


def make_tx(tx_id:int, account):
    return {
        "id": f"tx-{uuid.uuid4().hex}",
        "account": random.choice(account),
        "amount": round(random.uniform(10, 2000.0), 2),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "type": random.choice(["credit", "debit"])
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", default="http://localhost:8000/transactions")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--rate", type=float, default=1.0)
    parser.add_argument("--accounts", nargs="*", default=["A123", "B456", "C789"])
    args= parser.parse_args()

    delay = 1.0/args.rate if args.rate > 0 else 0.0
    for i in range(1, args.count + 1):
        # pass in the tx id and the list of accounts to the make_tx function to generate a transaction for 
        tx = make_tx(i, args.accounts)
        try:
            #trying to send the transaction to the server using the deined endpoin
            headers = {"x-api-key": "##SECRET_KEY"}
            r = requests.post(args.endpoint, json=tx, headers=headers, timeout=5)
            print(f"[{i}]{r.status_code} -> {r.text}")
        except Exception as e:
            print(f"[{i}] Error: {e}")
        if delay and i < args.count:
            time.sleep(delay)
if __name__ == "__main__":
    main()
    