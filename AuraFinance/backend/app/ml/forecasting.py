import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from typing import List, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from app import models
import os
import pickle

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
        
    # Fit or load Linear Regression: X = month index, Y = spending amount
    user_id = transactions[0].user_id if hasattr(transactions[0], 'user_id') else 0
    model = None
    
    SAVED_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
    model_path = os.path.join(SAVED_MODELS_DIR, f"regression_user_{user_id}.pkl")
    
    X = np.arange(n_months).reshape(-1, 1)
    Y = monthly_spend["amount"].values
    
    trained_on_months = 0
    test_r2 = None
    test_rmse = None
    train_r2 = None
    train_rmse = None
    model_formula = None
    is_locally_trained = False
    
    if os.path.exists(model_path):
        try:
            with open(model_path, "rb") as f:
                saved_data = pickle.load(f)
                if isinstance(saved_data, dict) and "model" in saved_data:
                    model = saved_data["model"]
                    trained_on_months = saved_data.get("trained_on_months", 0)
                    test_r2 = saved_data.get("test_r2")
                    test_rmse = saved_data.get("test_rmse")
                    train_r2 = saved_data.get("train_r2")
                    train_rmse = saved_data.get("train_rmse")
                    model_formula = saved_data.get("model_formula")
                    is_locally_trained = saved_data.get("is_locally_trained", False)
                else:
                    model = saved_data
                    trained_on_months = n_months # fallback
        except Exception as e:
            print(f"Error loading saved regression model for user {user_id}: {e}")
            
    if model is None or trained_on_months != n_months:
        # Perform training
        if n_months >= 6:
            train_size = n_months - 3
            X_train = np.arange(train_size).reshape(-1, 1)
            Y_train = Y[:train_size]
            X_test_split = np.arange(train_size, n_months).reshape(-1, 1)
            Y_test_split = Y[train_size:]
            
            eval_model = LinearRegression()
            eval_model.fit(X_train, Y_train)
            Y_pred_test = eval_model.predict(X_test_split)
            test_mse = mean_squared_error(Y_test_split, Y_pred_test)
            test_r2 = float(r2_score(Y_test_split, Y_pred_test))
            test_rmse = float(np.sqrt(test_mse))
            train_r2 = None
            train_rmse = None
        else:
            X_all = np.arange(n_months).reshape(-1, 1)
            Y_all = Y
            eval_model = LinearRegression()
            eval_model.fit(X_all, Y_all)
            predictions_all = eval_model.predict(X_all)
            train_mse = mean_squared_error(Y_all, predictions_all)
            train_r2 = float(r2_score(Y_all, predictions_all))
            train_rmse = float(np.sqrt(train_mse))
            test_r2 = None
            test_rmse = None
            
        model = LinearRegression()
        model.fit(X, Y)
        trained_on_months = n_months
        model_formula = f"Spending = {model.coef_[0]:.2f} * Month + {model.intercept_:.2f}"
        is_locally_trained = True
        
        # Save the model
        try:
            os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
            with open(model_path, "wb") as f:
                pickle.dump({
                    "model": model,
                    "trained_on_months": n_months,
                    "test_r2": test_r2,
                    "test_rmse": test_rmse,
                    "train_r2": train_r2,
                    "train_rmse": train_rmse,
                    "model_formula": model_formula,
                    "is_locally_trained": True
                }, f)
        except Exception as e:
            print(f"Error saving regression model for user {user_id}: {e}")
            
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
        "trend": trend,
        "test_r2": test_r2,
        "test_rmse": test_rmse,
        "train_r2": train_r2,
        "train_rmse": train_rmse,
        "trained_on_months": int(trained_on_months if trained_on_months > 0 else n_months),
        "model_formula": model_formula,
        "is_locally_trained": is_locally_trained
    }
