from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app import crud, models, schemas, db
from app.routers.auth import get_current_user
from app.ml.clustering import analyze_spending_personality
from app.ml.anomaly import detect_anomaly
from app.ml.forecasting import forecast_monthly_spending
from app.ml.scoring import calculate_financial_health_score
from app.ml.subscription_detector import detect_subscriptions

router = APIRouter(
    prefix="/analytics",
    tags=["Machine Learning & Analytics"]
)

@router.get("/personality", response_model=schemas.PersonalityResponse)
def get_spending_personality(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    transactions = crud.get_transactions(session, user_id=current_user.id, limit=1000)
    result = analyze_spending_personality(transactions)
    
    # Save the updated personality name in the User DB model
    if "personality" in result and "Draft" not in result["personality"]:
        crud.update_user_personality(session, user_id=current_user.id, personality=result["personality"])
        
    return result

@router.get("/forecast", response_model=schemas.SpendForecastResponse)
def get_spend_forecast(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    transactions = crud.get_transactions(session, user_id=current_user.id, limit=2000)
    return forecast_monthly_spending(transactions)

@router.get("/health-score", response_model=schemas.HealthScoreResponse)
def get_financial_health_score(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    transactions = crud.get_transactions(session, user_id=current_user.id, limit=2000)
    budgets = crud.get_budgets(session, user_id=current_user.id)
    return calculate_financial_health_score(transactions, budgets)

@router.get("/subscriptions")
def get_detected_subscriptions(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    transactions = crud.get_transactions(session, user_id=current_user.id, limit=1500)
    detected = detect_subscriptions(transactions)
    
    # Keep database subscriptions in sync
    db_subs = crud.get_subscriptions(session, user_id=current_user.id)
    db_subs_merchants = {s.merchant.lower(): s for s in db_subs}
    
    for sub in detected:
        merchant_l = sub["merchant"].lower()
        if merchant_l not in db_subs_merchants:
            # Auto-save newly detected subscription into DB
            crud.create_subscription(
                session, 
                subscription=schemas.SubscriptionCreate(
                    merchant=sub["merchant"],
                    amount=sub["amount"],
                    category=sub["category"],
                    periodicity=sub["periodicity"],
                    next_billing_date=sub["next_billing_date"],
                    is_active=True
                ),
                user_id=current_user.id
            )
            
    # Refetch updated subscriptions from DB to return
    final_subs = crud.get_subscriptions(session, user_id=current_user.id)
    return final_subs

@router.post("/subscriptions/{sub_id}/toggle")
def toggle_sub(
    sub_id: int,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    res = crud.toggle_subscription_status(session, subscription_id=sub_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return res

@router.delete("/subscriptions/{sub_id}")
def delete_sub(
    sub_id: int,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    res = crud.delete_subscription(session, subscription_id=sub_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"detail": "Subscription removed"}

@router.get("/insights", response_model=List[schemas.AIInsightResponse])
def get_user_insights(
    unread_only: bool = False,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    return crud.get_insights(session, user_id=current_user.id, unread_only=unread_only)

@router.post("/insights/{insight_id}/read")
def read_insight(
    insight_id: int,
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    res = crud.mark_insight_read(session, insight_id=insight_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Insight not found")
    return res

@router.get("/dashboard-overview", response_model=schemas.DashboardOverview)
def get_dashboard_overview(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    transactions = crud.get_transactions(session, user_id=current_user.id, limit=2000)
    
    total_income = sum(tx.amount for tx in transactions if tx.type == "credit")
    total_expense = sum(tx.amount for tx in transactions if tx.type == "debit")
    balance = total_income - total_expense
    
    # Calculate savings rate
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = max(0.0, (total_income - total_expense) / total_income)
        
    recent_transactions = crud.get_transactions(session, user_id=current_user.id, limit=5)
    insights = crud.get_insights(session, user_id=current_user.id, unread_only=True)[:3]
    
    # Generate proactive general tip if no insights are generated
    if not insights and len(transactions) > 0:
        # Generate generic tip based on transactions
        insights = [
            schemas.AIInsightResponse(
                id=0,
                user_id=current_user.id,
                title="AI Behavior Check",
                description="Your cash flow appears stable. Try establishing category budgets under settings to further optimize your savings rate.",
                type="tip",
                is_read=False,
                created_at=current_user.created_at
            )
        ]
        
    return {
        "total_balance": balance,
        "monthly_income": total_income,
        "monthly_expenses": total_expense,
        "savings_rate": savings_rate,
        "recent_transactions": recent_transactions,
        "insights": insights
    }
