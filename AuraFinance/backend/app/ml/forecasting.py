import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import List, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from app import models

def forecast_monthly_spending(transactions: List[models.Transaction]) -> Dict[str, Any]:
    """
    Groups transaction data by month, trains a Linear Regression model, and
    predicts the spending for the next 3 months, returning historical points,
    predictions, confidence intervals, and a trend analysis.
    """
    # Extract only debit transactions (spending)
    debits = [tx for tx in transactions if tx.type == "debit"]
    
    if not debits:
        return {
            "history": [],
            "forecast": [],
            "trend": "stable"
        }
        
    df = pd.DataFrame([
        {
            "date": pd.to_datetime(tx.date),
            "amount": abs(tx.amount)
        } for tx in debits
    ])
    
    # Resample by month
    df.set_index("date", inplace=True)
    monthly_spend = df.resample("ME")["amount"].sum().reset_index()
    
    # Format history output for Recharts
    history_list = []
    for _, row in monthly_spend.iterrows():
        history_list.append({
            "period": row["date"].strftime("%b %Y"),
            "amount": float(row["amount"])
        })
        
    n_months = len(monthly_spend)
    
    # Heuristic fallback if we have less than 3 months of data
    if n_months < 3:
        # Fallback using average of existing months or single value
        avg_spend = monthly_spend["amount"].mean() if n_months > 0 else 0.0
        last_date = monthly_spend["date"].iloc[-1] if n_months > 0 else datetime.now()
        
        forecast_list = []
        for i in range(1, 4):
            f_date = last_date + relativedelta(months=i)
            forecast_list.append({
                "period": f_date.strftime("%b %Y"),
                "predicted_amount": float(avg_spend),
                "lower_bound": float(avg_spend * 0.8),
                "upper_bound": float(avg_spend * 1.2)
            })
            
        return {
            "history": history_list,
            "forecast": forecast_list,
            "trend": "stable (Low Data)"
        }
        
    # Fit Linear Regression: X = month index, Y = spending amount
    X = np.arange(n_months).reshape(-1, 1)
    Y = monthly_spend["amount"].values
    
    model = LinearRegression()
    model.fit(X, Y)
    
    # Calculate standard error of prediction to build bounds
    predictions = model.predict(X)
    residuals = Y - predictions
    std_err = np.std(residuals) if len(residuals) > 1 else Y[0] * 0.1
    std_err = max(std_err, 50.0) # Ensure a reasonable spread
    
    # Forecast next 3 months
    forecast_list = []
    last_date = monthly_spend["date"].iloc[-1]
    
    for i in range(1, 4):
        next_month_idx = n_months + i - 1
        predicted_val = max(0.0, float(model.predict([[next_month_idx]])[0]))
        
        # Upper and lower bounds (90% confidence-like band: predictions +/- 1.64 * std_err)
        lower_b = max(0.0, predicted_val - 1.64 * std_err)
        upper_b = predicted_val + 1.64 * std_err
        
        f_date = last_date + relativedelta(months=i)
        
        forecast_list.append({
            "period": f_date.strftime("%b %Y"),
            "predicted_amount": round(predicted_val, 2),
            "lower_bound": round(lower_b, 2),
            "upper_bound": round(upper_b, 2)
        })
        
    # Calculate slope trend
    slope = model.coef_[0]
    # Threshold for trend classification: if slope is > 5% of average monthly spending
    avg_spending = Y.mean()
    threshold = avg_spending * 0.03
    
    if slope > threshold:
        trend = "increasing"
    elif slope < -threshold:
        trend = "decreasing"
    else:
        trend = "stable"
        
    return {
        "history": history_list,
        "forecast": forecast_list,
        "trend": trend
    }
