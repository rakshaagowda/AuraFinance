from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime, date
import csv
import io
import re
from typing import List, Optional
from app import crud, models, schemas, db
from app.routers.auth import get_current_user
from app.ml.anomaly import detect_anomaly

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)

@router.get("/", response_model=List[schemas.TransactionResponse])
def get_user_transactions(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    return crud.get_transactions(session, user_id=current_user.id, skip=skip, limit=limit, category=category)

@router.post("/", response_model=schemas.TransactionResponse)
def add_transaction(
    transaction: schemas.TransactionCreate,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    is_anom = False
    anom_score = 0.0
    
    # Run anomaly detector only on expenses (debits)
    if transaction.type == "debit":
        history = crud.get_transactions(session, user_id=current_user.id, limit=200)
        is_anom, anom_score = detect_anomaly(
            transaction.amount, 
            transaction.category, 
            transaction.date, 
            history
        )
        
        # Proactively generate an AI Insight warning if anomaly detected
        if is_anom:
            crud.create_insight(
                session, 
                user_id=current_user.id,
                title="Unusual Spend Flagged",
                description=f"An anomalous transaction of ₹{transaction.amount} in category '{transaction.category}' was detected on {transaction.date}. Review this entry to ensure it was authorized.",
                type="warning"
            )
            
    return crud.create_transaction(session, transaction=transaction, user_id=current_user.id, is_anomaly=is_anom, anomaly_score=anom_score)

@router.delete("/{transaction_id}")
def remove_transaction(
    transaction_id: int,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    success = crud.delete_transaction(session, transaction_id=transaction_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or unauthorized"
        )
    return {"detail": "Transaction deleted successfully"}

# Budgets CRUD in transactions router to group related functions
@router.get("/budgets", response_model=List[schemas.BudgetResponse])
def get_user_budgets(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    # Default to current month/year if not specified
    now = datetime.now()
    y = year or now.year
    m = month or now.month
    return crud.get_budgets(session, user_id=current_user.id, year=y, month=m)

@router.post("/budgets", response_model=schemas.BudgetResponse)
def set_budget(
    budget: schemas.BudgetCreate,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    return crud.create_or_update_budget(session, budget=budget, user_id=current_user.id)

# CSV Bank Statement Uploader
@router.post("/upload-statement")
def upload_bank_statement(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    try:
        content = file.file.read().decode("utf-8")
        reader = csv.reader(io.StringIO(content))
        
        # Extract headers to detect column mapping
        headers = next(reader, None)
        if not headers:
            raise HTTPException(status_code=400, detail="Empty CSV file")
            
        # Standardize headers for mapping
        headers_lower = [h.lower().strip() for h in headers]
        
        # Mappings indices
        date_idx = -1
        desc_idx = -1
        amount_idx = -1
        cat_idx = -1
        type_idx = -1
        
        # Locate indices based on regex
        for i, header in enumerate(headers_lower):
            if re.search(r"date", header):
                date_idx = i
            elif re.search(r"desc|merchant|payee|name", header):
                desc_idx = i
            elif re.search(r"amount|value|sum", header):
                amount_idx = i
            elif re.search(r"category|cat", header):
                cat_idx = i
            elif re.search(r"type|debit/credit", header):
                type_idx = i
                
        # Default fallbacks if indices couldn't be determined by headers
        if date_idx == -1: date_idx = 0
        if desc_idx == -1: desc_idx = 1
        if amount_idx == -1: amount_idx = 2
        if cat_idx == -1: cat_idx = 3 if len(headers) > 3 else -1
        if type_idx == -1: type_idx = 4 if len(headers) > 4 else -1
        
        transactions_to_add = []
        history = crud.get_transactions(session, user_id=current_user.id, limit=200)
        
        row_count = 0
        for row in reader:
            if not row or len(row) <= max(date_idx, desc_idx, amount_idx):
                continue
                
            row_count += 1
            # Parse Date
            raw_date = row[date_idx].strip()
            tx_date = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    tx_date = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            if not tx_date:
                tx_date = date.today() # default fallback
                
            # Parse Description
            description = row[desc_idx].strip()
            
            # Parse Amount
            raw_amount = row[amount_idx].strip().replace("$", "").replace("₹", "").replace("Rs.", "").replace("INR", "").replace(",", "").strip()
            try:
                amount = float(raw_amount)
            except ValueError:
                amount = 0.0
                
            # Parse Type & Category
            tx_type = "debit"
            if type_idx != -1 and type_idx < len(row):
                raw_type = row[type_idx].strip().lower()
                if "credit" in raw_type or "deposit" in raw_type or "income" in raw_type or amount > 0:
                    tx_type = "credit"
            else:
                if amount > 0:
                    tx_type = "credit"
                else:
                    tx_type = "debit"
                    
            amount = abs(amount)
            
            category = "Other"
            if cat_idx != -1 and cat_idx < len(row) and row[cat_idx].strip():
                raw_cat = row[cat_idx].strip()
                # standard clean-up
                for known_cat in ["Food", "Utilities", "Entertainment", "Investment", "Shopping", "Housing", "Travel", "Income", "Debt"]:
                    if known_cat.lower() in raw_cat.lower():
                        category = known_cat
                        break
            else:
                # Heuristic mapping based on merchant descriptions
                desc_l = description.lower()
                if any(x in desc_l for x in ["walmart", "target", "grocery", "market", "safeway", "kroger", "whole foods"]):
                    category = "Food"
                elif any(x in desc_l for x in ["netflix", "spotify", "hulu", "disney", "steam", "cinema", "show", "pub", "bar"]):
                    category = "Entertainment"
                elif any(x in desc_l for x in ["electric", "water", "gas", "power", "internet", "comcast", "phone", "verizon", "t-mobile"]):
                    category = "Utilities"
                elif any(x in desc_l for x in ["fidelity", "vanguard", "stocks", "robinhood", "etf", "invest"]):
                    category = "Investment"
                elif any(x in desc_l for x in ["amazon", "nike", "store", "buy", "mall", "clothes", "nordstrom"]):
                    category = "Shopping"
                elif any(x in desc_l for x in ["rent", "mortgage", "housing", "landlord", "apartment"]):
                    category = "Housing"
                elif any(x in desc_l for x in ["uber", "lyft", "flight", "airline", "delta", "hotel", "airbnb", "gasoline", "shell", "chevron"]):
                    category = "Travel"
                elif any(x in desc_l for x in ["salary", "payroll", "dividend", "venmo deposit"]):
                    category = "Income"
                elif any(x in desc_l for x in ["card payment", "loan", "interest charge"]):
                    category = "Debt"
            
            # Anomaly check
            is_anom = False
            anom_score = 0.0
            if tx_type == "debit":
                is_anom, anom_score = detect_anomaly(amount, category, tx_date, history)
                
            db_tx = models.Transaction(
                user_id=current_user.id,
                date=tx_date,
                description=description,
                amount=amount,
                category=category,
                type=tx_type,
                is_anomaly=is_anom,
                anomaly_score=anom_score
            )
            transactions_to_add.append(db_tx)
            
        crud.create_transaction_bulk(session, transactions_to_add)
        return {"detail": f"Successfully imported {len(transactions_to_add)} transactions."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process statement CSV. Error: {str(e)}")

# OCR Receipt Scan Simulator
# Exposes an endpoint that receives an image file, simulates OCR parsing,
# and returns structured JSON for the frontend to autofill the form.
@router.post("/scan-receipt")
def scan_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    # Simulated OCR OCR processing using filename or common text patterns in receipts
    filename = file.filename.lower()
    
    # Defaults
    merchant = "Merchant Store"
    amount = 250.00
    category = "Shopping"
    tx_date = date.today()
    
    # We parse the filename/input to extract fields to simulate highly responsive AI OCR
    if "starbucks" in filename or "coffee" in filename:
        merchant = "Starbucks"
        amount = 720.00
        category = "Food"
    elif "walmart" in filename or "grocery" in filename or "reliance" in filename or "bigbasket" in filename:
        merchant = "Reliance Smart"
        amount = 3450.00
        category = "Food"
    elif "amazon" in filename or "package" in filename:
        merchant = "Amazon.in"
        amount = 45990.00
        category = "Shopping"
    elif "uber" in filename or "ride" in filename:
        merchant = "Uber India"
        amount = 1450.00
        category = "Travel"
    elif "shell" in filename or "gas" in filename or "indianoil" in filename:
        merchant = "IndianOil"
        amount = 3500.00
        category = "Travel"
    else:
        # Generate semi-random realistic values to simulate parsing any image
        import random
        merchants = ["Zara India", "Reliance Digital", "Zomato", "BookMyShow", "Apollo Pharmacy"]
        merchant = random.choice(merchants)
        
        category_map = {
            "Zara India": ("Shopping", 5499.00),
            "Reliance Digital": ("Shopping", 24999.00),
            "Zomato": ("Food", 650.00),
            "BookMyShow": ("Entertainment", 920.00),
            "Apollo Pharmacy": ("Other", 450.00)
        }
        category, amount = category_map[merchant]

    return {
        "merchant": merchant,
        "amount": amount,
        "category": category,
        "date": tx_date.strftime("%Y-%m-%d"),
        "confidence": 0.98,
        "raw_text": f"MOCKED OCR TEXT:\n------------------\n{merchant.upper()} #5812\nDATE: {tx_date.strftime('%d/%m/%Y')}\nITEMS:\n  ITEM A - 1x - ₹{amount * 0.4:.2f}\n  ITEM B - 1x - ₹{amount * 0.6:.2f}\nTOTAL: ₹{amount:.2f}\nGST (18%): INCLUDED\nTHANK YOU FOR SHOPPING!\n------------------"
    }
