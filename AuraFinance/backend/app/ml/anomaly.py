import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import List, Tuple
from app import models

CATEGORY_MAPPING = {
    "Food": 0,
    "Utilities": 1,
    "Entertainment": 2,
    "Investment": 3,
    "Shopping": 4,
    "Housing": 5,
    "Travel": 6,
    "Income": 7,
    "Debt": 8,
    "Other": 9
}

def detect_anomaly(
    transaction_amount: float, 
    transaction_category: str, 
    transaction_date, 
    historical_transactions: List[models.Transaction]
) -> Tuple[bool, float]:
    """
    Fits an Isolation Forest on the historical transactions of a user and predicts
    whether a new transaction is anomalous.
    Falls back to a standard deviation heuristic if historical data is insufficient (< 10 transactions).
    """
    
    amount = abs(transaction_amount)
    category_idx = CATEGORY_MAPPING.get(transaction_category, 9)
    day_of_week = transaction_date.weekday() if hasattr(transaction_date, 'weekday') else 0
    
    # Heuristic fallback if low historical data
    if len(historical_transactions) < 10:
        if not historical_transactions:
            return False, 0.0
        
        amounts = [abs(tx.amount) for tx in historical_transactions if tx.type == "debit"]
        if not amounts:
            return False, 0.0
            
        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts)
        
        # If amount is more than 3 standard deviations above the mean and > $150, or simply > $1000
        threshold = max(mean_amount + 3.0 * std_amount, 250.0) if std_amount > 0 else 500.0
        
        if amount > threshold:
            # Scale anomaly score based on how far past threshold it is
            score = min(1.0, (amount - threshold) / threshold)
            return True, float(score)
        return False, 0.0

    # Format historical features
    history_data = []
    for tx in historical_transactions:
        # Only fit on debits for spending anomalies
        if tx.type == "debit":
            tx_day = tx.date.weekday() if hasattr(tx.date, 'weekday') else 0
            history_data.append({
                "amount": abs(tx.amount),
                "category_idx": CATEGORY_MAPPING.get(tx.category, 9),
                "day_of_week": tx_day
            })
            
    if len(history_data) < 5:
        # Not enough debit transactions
        return False, 0.0
        
    df_history = pd.DataFrame(history_data)
    
    # Train Isolation Forest
    # contamination = 0.05 (expecting roughly 5% anomalies in standard transactions)
    clf = IsolationForest(contamination=0.05, random_state=42)
    clf.fit(df_history[["amount", "category_idx", "day_of_week"]])
    
    # Predict for current transaction
    current_feat = pd.DataFrame([{
        "amount": amount,
        "category_idx": category_idx,
        "day_of_week": day_of_week
    }])
    
    prediction = clf.predict(current_feat)[0] # 1 = normal, -1 = anomaly
    raw_score = clf.decision_function(current_feat)[0] # lower = more anomalous
    
    # Map decision function score to a 0-1 scale (where 1 is highly anomalous)
    # The decision function returns negative values for anomalies and positive for normal.
    # Typically raw_score is between -0.5 and 0.5.
    anomaly_probability = float(1.0 / (1.0 + np.exp(raw_score * 10))) # Sigmoid mapping
    
    is_anom = bool(prediction == -1)
    
    # Even if predicted normal, flag as anomaly if the amount is extremely high compared to history
    max_history = df_history["amount"].max()
    if amount > max_history * 3.0 and amount > 500.0:
        is_anom = True
        anomaly_probability = max(anomaly_probability, 0.8)
        
    return is_anom, anomaly_probability
