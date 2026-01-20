# Bank Transaction Integration Demo (AWS Serverless)

## 📌 Overview
This project is a **serverless AWS demo** that simulates how a bank could send transaction data to a platform, where it is **validated, stored, and analyzed in near real-time** using AWS managed services.

The goal of this project is to **learn and demonstrate core AWS serverless concepts**—not to build a production banking system.  
It is intentionally designed to be **beginner-friendly**, making it easy for people new to AWS to understand how services like **API Gateway, Lambda, DynamoDB, and CloudWatch** work together.

---

## ✅ What This Project Does
- Simulates a *mock bank* sending transaction data
- Receives transactions through **AWS API Gateway**
- Processes and validates data using **AWS Lambda**
- Stores transactions in **Amazon DynamoDB**
- Computes simple analytics (totals, max transaction, flags)
- Returns analytics results to a client
- Logs and monitors activity using **Amazon CloudWatch**

---

## 🏗️ Architecture Overview

Bank Simulator (Local Python Script)
|
| HTTP POST
v
API Gateway (/transactions)
|
v
AWS Lambda (TransactionProcessor)
|
|----> DynamoDB (Structured transaction storage)
|
|----> S3 (Optional raw JSON backup)
|
v
Analytics Lambda (/analytics)
|
v
Client receives analytics JSON

---

## 🧰 Technologies Used
- **AWS API Gateway** – Public REST endpoints
- **AWS Lambda (Python 3.11)** – Serverless compute
- **Amazon DynamoDB** – NoSQL database
- **Amazon S3** *(optional)* – Raw data backup
- **Amazon CloudWatch** – Logs and metrics
- **AWS IAM** – Secure permissions
- **Python** – Bank simulator and Lambda logic

---

## 🎯 Project Goals
- Learn AWS serverless architecture
- Practice IAM roles and permissions
- Build an event-driven data pipeline
- Implement basic real-time analytics
- Create a project that can be clearly explained in interviews

---

## 📦 Sample Transaction Payload

```json
{
  "id": "1",
  "account": "A123",
  "amount": 250.50,
  "type": "credit",
  "timestamp": "2026-01-10T14:00:00Z"
}
```
🗓️ Project Timeline & Implementation
Day 1 — Bank Simulator (Local)

Goal: Simulate a bank sending transactions.

Created a Python script that:

Generates random transaction data

Sends transactions via HTTP POST

Verified payload format locally using Flask/FastAPI

Added optional looping to simulate multiple transactions per second

Deliverable:
✔️ A working bank simulator capable of sending valid transaction payloads.

Day 2 — API Gateway & Lambda Setup

Goal: Receive transactions in AWS.

API Gateway Configuration

Created a REST API named BankTransactionAPI

Added resource:

/transactions

Added method:

POST

Enabled Lambda Proxy Integration

Deployed to stage: prod

Endpoint format:

https://<api-id>.execute-api.<region>.amazonaws.com/prod/transactions

⚙️ Lambda Function: Transaction Processing
Step 1 — Create the Lambda Function

Purpose:
This Lambda function validates incoming transactions and stores them in DynamoDB.

Steps:

AWS Console → Lambda → Create function

Choose Author from scratch

Configure:

Function name: TransactionProcessor

Runtime: Python 3.11

Execution role: Create new role with basic Lambda permissions

Click Create function

📊 Day 3 — Data Storage & Analytics
Step 2 — Create DynamoDB Table

Purpose:
Store structured transaction data in a scalable, serverless database.

Steps:

AWS Console → DynamoDB → Tables → Create table

Configure:

Table name: Transactions

Partition key: id (String)

Sort key: None

Billing mode: On-demand

Region: us-east-2

Click Create table

Step 3 — Grant Lambda Write Permissions

Why this matters:
Lambda does not have database access by default. IAM permissions must be explicitly granted following the principle of least privilege.

IAM Inline Policy:
```

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPutItem",
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-2:YOUR_ACCOUNT_ID:table/Transactions"
    }
  ]
}

```
Policy name: TransactionProcessorDDBWrite

Step 4 — Lambda Code (Store Transactions)

Purpose:

Parse incoming JSON

Validate required fields

Convert floats to Decimal (required by DynamoDB)

Store transactions
```
import json
import logging
import os
from decimal import Decimal
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ddb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'Transactions')
table = ddb.Table(TABLE_NAME)

def to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_decimal(x) for x in obj]
    return obj

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))

    required = ['id', 'account', 'amount', 'type', 'timestamp']
    for field in required:
        if field not in body:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Missing field: {field}'})
            }

    if body['amount'] <= 0:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Amount must be > 0'})
        }

    table.put_item(Item=to_decimal(body))

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Transaction stored successfully'})
    }
```
Step 5 — Environment Variables

Add the following to the Lambda configuration:

Key: TABLE_NAME

Value: Transactions

Step 6 — Test Data Storage

Send transactions using the bank simulator

DynamoDB → Transactions → Explore table items

Verify new records appear

📈 Optional: Analytics Lambda
Purpose

Provides basic analytics over stored transactions.

Setup

Lambda name: GetAnalytics

Runtime: Python 3.11

IAM permission: dynamodb:Scan

Environment variable: TABLE_NAME=Transactions
```
import json
import os
import boto3
from decimal import Decimal

ddb = boto3.resource('dynamodb')
table = ddb.Table(os.environ.get('TABLE_NAME', 'Transactions'))

def d_to_float(o):
    if isinstance(o, list):
        return [d_to_float(x) for x in o]
    if isinstance(o, dict):
        return {k: d_to_float(v) for k, v in o.items()}
    if isinstance(o, Decimal):
        return float(o)
    return o

def lambda_handler(event, context):
    items = table.scan().get('Items', [])
    return {
        'statusCode': 200,
        'body': json.dumps(d_to_float(items))
    }

```
Expose via API Gateway:

GET /analytics

Deploy to prod

📊 Monitoring & Observability

CloudWatch Logs: Lambda execution logs

CloudWatch Metrics: Requests per minute

Enables easy debugging and performance monitoring

🔐 Security Considerations

IAM roles with least privilege

API Gateway API key

No credentials stored in the repository

Encrypted storage by default (DynamoDB)

🧠 What I Learned

Building serverless pipelines with AWS

IAM permission design and debugging

DynamoDB data modeling

Event-driven architectures

Monitoring with CloudWatch

Designing scalable demos for interviews

🚀 Future Improvements

Add SQS for high-volume traffic

Use DynamoDB indexes instead of scans

Authentication with Cognito

Frontend analytics dashboard

Multi-bank / multi-tenant support

⚠️ Disclaimer

This project is for learning and demonstration purposes only and is not intended for real financial systems.

👩‍💻 Author

Mary Nansikombi
Computer Science | Cloud & DevOps Enthusiast