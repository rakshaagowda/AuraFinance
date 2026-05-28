from typing import List, Dict, Any
from app import models

def calculate_financial_health_score(
    transactions: List[models.Transaction],
    budgets: List[models.Budget]
) -> Dict[str, Any]:
    """
    Computes a Financial Health Score (0-100), sub-scores, and provides
    smart, context-aware suggestions based on user behavior.
    """
    if not transactions:
        return {
            "score": 50,
            "grade": "C",
            "breakdown": {
                "savings_score": 50.0,
                "budgeting_efficiency": 50.0,
                "debt_risk": 50.0,
                "overspending_risk": 50.0
            },
            "recommendations": [
                "Log your first transaction to start receiving financial health ratings.",
                "Set monthly budgets for major spending categories under the Transactions page."
            ]
        }

    # Aggregate incomes and expenses
    total_income = sum(tx.amount for tx in transactions if tx.type == "credit")
    total_expense = sum(tx.amount for tx in transactions if tx.type == "debit")
    
    # Calculate Savings Rate Score (40% weight)
    # Target savings rate is 20% or higher for a perfect savings score (100)
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = max(0.0, (total_income - total_expense) / total_income)
        savings_score = min(100.0, (savings_rate / 0.20) * 100.0)
    else:
        # Default or fallback if income isn't logged yet
        savings_score = max(10.0, 100.0 - (total_expense / 1500.0) * 50.0) # Penalty for raw spending without logged income
        savings_score = min(100.0, savings_score)
        
    # Calculate Budgeting Efficiency (30% weight)
    # Compare transactions against budgets for categories
    budget_by_category = {b.category: b.amount for b in budgets}
    spend_by_category = {}
    for tx in transactions:
        if tx.type == "debit":
            spend_by_category[tx.category] = spend_by_category.get(tx.category, 0.0) + tx.amount
            
    budget_penalties = 0.0
    categories_monitored = 0
    
    for category, budget_amt in budget_by_category.items():
        categories_monitored += 1
        actual_spend = spend_by_category.get(category, 0.0)
        if actual_spend > budget_amt:
            # Overspent: calculate percentage overspent
            pct_over = (actual_spend - budget_amt) / budget_amt
            budget_penalties += min(50.0, pct_over * 50.0) # Cap penalty per category at 50 points
            
    if categories_monitored > 0:
        budgeting_efficiency = max(0.0, 100.0 - (budget_penalties / categories_monitored))
    else:
        # If no budgets are defined, neutral score
        budgeting_efficiency = 70.0
        
    # Calculate Debt Risk Score (15% weight)
    # Debt categories should be low. Debt-to-income ratio target < 15%
    debt_payments = spend_by_category.get("Debt", 0.0)
    if total_income > 0:
        debt_ratio = debt_payments / total_income
        if debt_ratio <= 0.10:
            debt_score = 100.0
        elif debt_ratio <= 0.30:
            debt_score = max(40.0, 100.0 - ((debt_ratio - 0.10) / 0.20) * 60.0)
        else:
            debt_score = max(0.0, 40.0 - ((debt_ratio - 0.30) / 0.20) * 40.0)
    else:
        # Default fallback
        debt_score = 100.0 if debt_payments == 0 else max(0.0, 100.0 - (debt_payments / 300.0) * 50.0)

    # Calculate Overspending Risk (15% weight)
    # Measures overall balance sheet wellness: spending > income or excessive anomalies
    anomaly_count = sum(1 for tx in transactions if tx.is_anomaly and tx.type == "debit")
    anomaly_penalty = min(40.0, anomaly_count * 10.0) # Penalty for frequent anomalies
    
    if total_income > 0:
        spend_to_income = total_expense / total_income
        if spend_to_income < 0.90:
            overspending_score = max(0.0, 100.0 - anomaly_penalty)
        else:
            # Overdraft risk
            overspending_score = max(0.0, 100.0 - ((spend_to_income - 0.90) / 0.30) * 80.0 - anomaly_penalty)
    else:
        overspending_score = max(0.0, 80.0 - anomaly_penalty)

    # Calculate Final Aggregate Score
    final_score = int(
        (savings_score * 0.40) +
        (budgeting_efficiency * 0.30) +
        (debt_score * 0.15) +
        (overspending_score * 0.15)
    )
    final_score = max(0, min(100, final_score))
    
    # Assign Letter Grade
    if final_score >= 90:
        grade = "A"
    elif final_score >= 80:
        grade = "B"
    elif final_score >= 70:
        grade = "C"
    elif final_score >= 60:
        grade = "D"
    else:
        grade = "F"
        
    # Generate Smart Recommendations
    recs = []
    
    if savings_rate < 0.20 and total_income > 0:
        recs.append(f"Your savings rate is {round(savings_rate * 100, 1)}%. Try cutting discretionary spending to reach the recommended 20% savings target.")
    elif total_income == 0:
        recs.append("Add your monthly income streams (salary, interest, freelance) to help us map your savings capabilities.")
        
    if budget_penalties > 0:
        overspent_cats = [cat for cat, amt in budget_by_category.items() if spend_by_category.get(cat, 0.0) > amt]
        recs.append(f"You exceeded your budget limits in: {', '.join(overspent_cats)}. Review these transaction logs to check where to trim costs.")
        
    if debt_payments > 0 and total_income > 0 and (debt_payments / total_income) > 0.15:
        recs.append("Your debt repayments exceed 15% of your gross income. Prioritize paying off high-interest debt using the snowball method.")
        
    if anomaly_count > 0:
        recs.append(f"We detected {anomaly_count} anomalous transaction(s) this period. Review flags under your History to ensure there is no fraud.")
        
    if budgeting_efficiency == 70.0 and len(budgets) == 0:
        recs.append("You have not set any budgets yet. Go to settings or transactions to initialize category thresholds.")
        
    if not recs:
        recs.append("Incredible job! You are meeting all savings targets, keeping debt low, and staying strictly inside budgets. Maintain this strategy!")
        
    return {
        "score": final_score,
        "grade": grade,
        "breakdown": {
            "savings_score": round(savings_score, 1),
            "budgeting_efficiency": round(budgeting_efficiency, 1),
            "debt_risk": round(debt_score, 1),
            "overspending_risk": round(overspending_score, 1)
        },
        "recommendations": recs[:4] # Keep top 4 recommendations
    }
