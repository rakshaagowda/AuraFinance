from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import pandas as pd
from app import models

def detect_subscriptions(transactions: List[models.Transaction]) -> List[Dict[str, Any]]:
    """
    Scans historical transactions, groups them by merchant, and identifies
    recurring payments based on dates and amounts.
    Returns a list of detected subscriptions.
    """
    debits = [tx for tx in transactions if tx.type == "debit"]
    
    if len(debits) < 4:
        # Low data
        return []
        
    df = pd.DataFrame([
        {
            "id": tx.id,
            "description": tx.description,
            "amount": abs(tx.amount),
            "category": tx.category,
            "date": pd.to_datetime(tx.date)
        } for tx in debits
    ])
    
    # Simple normalizer for merchant names: convert to lowercase, strip extra whitespace,
    # and match common subscription-like keywords.
    df["merchant_key"] = df["description"].str.lower().str.strip()
    # E.g. "netflix.com", "netflix digital" -> "netflix"
    def normalize_merchant(name):
        for kw in ["netflix", "spotify", "youtube premium", "hulu", "disney+", "amazon prime", "chatgpt", "github", "adobe", "gym", "insurance", "zoom", "canva", "notion", "office 365", "google cloud", "aws", "cursor"]:
            if kw in name:
                return kw.capitalize()
        return name.title()
        
    df["normalized_merchant"] = df["merchant_key"].apply(normalize_merchant)
    
    detected_subs = []
    
    # Group by merchant and amount (allowing minor variance in amount, say +/- 5%)
    # To keep it robust, we'll group by normalized merchant and examine date spacing
    grouped = df.groupby("normalized_merchant")
    
    for merchant, group in grouped:
        if len(group) < 2:
            # Subscriptions need at least 2 payments to prove recurrence
            continue
            
        # Sort by date
        group_sorted = group.sort_values("date")
        
        # Check differences between consecutive dates
        dates = group_sorted["date"].tolist()
        amounts = group_sorted["amount"].tolist()
        categories = group_sorted["category"].tolist()
        
        # Calculate diffs in days
        diffs = []
        for i in range(len(dates) - 1):
            diff = (dates[i+1] - dates[i]).days
            diffs.append(diff)
            
        # Analyze diffs to find periodic cycles
        # Weekly: ~7 days (5-9 days)
        # Monthly: ~30 days (25-33 days)
        # Yearly: ~365 days (350-380 days)
        
        is_recurring = False
        periodicity = None
        interval_days = 0
        
        # Check if intervals are consistently around weekly/monthly/yearly
        avg_diff = sum(diffs) / len(diffs)
        
        if 5 <= avg_diff <= 9:
            is_recurring = True
            periodicity = "Weekly"
            interval_days = 7
        elif 25 <= avg_diff <= 33:
            is_recurring = True
            periodicity = "Monthly"
            interval_days = 30
        elif 345 <= avg_diff <= 380:
            is_recurring = True
            periodicity = "Yearly"
            interval_days = 365
            
        # Fallback: check if the merchant name matches famous subscriptions
        famous_subs = ["Netflix", "Spotify", "Youtube Premium", "Hulu", "Disney+", "Amazon Prime", "Chatgpt", "Github", "Adobe", "Gym", "Zoom", "Canva", "Notion", "Office 365", "Cursor"]
        if not is_recurring and merchant in famous_subs:
            # Even with 1 or 2 spaced payments, if it's a known recurring brand, mark as monthly
            is_recurring = True
            periodicity = "Monthly"
            interval_days = 30
            
        if is_recurring:
            # Estimate next billing date based on last payment + interval
            last_payment_date = dates[-1]
            next_billing = last_payment_date + timedelta(days=interval_days)
            
            # Use average amount
            avg_amount = sum(amounts) / len(amounts)
            
            detected_subs.append({
                "merchant": merchant,
                "amount": round(avg_amount, 2),
                "category": categories[-1],
                "periodicity": periodicity,
                "next_billing_date": next_billing.date(),
                "last_payment_date": last_payment_date.date()
            })
            
    return detected_subs
