from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, date
from typing import List, Optional
from passlib.context import CryptContext
from app import models, schemas

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Passwords
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# User Operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pwd = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_pwd)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_personality(db: Session, user_id: int, personality: str):
    db_user = get_user(db, user_id)
    if db_user:
        db_user.spending_personality = personality
        db.commit()
        db.refresh(db_user)
    return db_user

# Transaction Operations
def get_transactions(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    if category:
        query = query.filter(models.Transaction.category == category)
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)
    return query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: int, is_anomaly: bool = False, anomaly_score: float = 0.0):
    db_tx = models.Transaction(
        **transaction.model_dump(),
        user_id=user_id,
        is_anomaly=is_anomaly,
        anomaly_score=anomaly_score
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

def create_transaction_bulk(db: Session, transactions: List[models.Transaction]):
    db.add_all(transactions)
    db.commit()
    return transactions

def delete_transaction(db: Session, transaction_id: int, user_id: int):
    db_tx = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id, 
        models.Transaction.user_id == user_id
    ).first()
    if db_tx:
        db.delete(db_tx)
        db.commit()
        return True
    return False

# Budget Operations
def get_budgets(db: Session, user_id: int, year: Optional[int] = None, month: Optional[int] = None):
    query = db.query(models.Budget).filter(models.Budget.user_id == user_id)
    if year:
        query = query.filter(models.Budget.year == year)
    if month:
        query = query.filter(models.Budget.month == month)
    return query.all()

def create_or_update_budget(db: Session, budget: schemas.BudgetCreate, user_id: int):
    # Check if budget for this category and month/year already exists
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == user_id,
        models.Budget.category == budget.category,
        models.Budget.month == budget.month,
        models.Budget.year == budget.year
    ).first()
    
    if existing:
        existing.amount = budget.amount
        db.commit()
        db.refresh(existing)
        return existing
    else:
        db_budget = models.Budget(**budget.model_dump(), user_id=user_id)
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)
        return db_budget

# Subscription Operations
def get_subscriptions(db: Session, user_id: int, active_only: bool = False):
    query = db.query(models.Subscription).filter(models.Subscription.user_id == user_id)
    if active_only:
        query = query.filter(models.Subscription.is_active == True)
    return query.all()

def create_subscription(db: Session, subscription: schemas.SubscriptionCreate, user_id: int):
    db_sub = models.Subscription(**subscription.model_dump(), user_id=user_id)
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

def toggle_subscription_status(db: Session, subscription_id: int, user_id: int):
    db_sub = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.user_id == user_id
    ).first()
    if db_sub:
        db_sub.is_active = not db_sub.is_active
        db.commit()
        db.refresh(db_sub)
        return db_sub
    return None

def delete_subscription(db: Session, subscription_id: int, user_id: int):
    db_sub = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.user_id == user_id
    ).first()
    if db_sub:
        db.delete(db_sub)
        db.commit()
        return True
    return False

# AIInsight Operations
def get_insights(db: Session, user_id: int, unread_only: bool = False):
    query = db.query(models.AIInsight).filter(models.AIInsight.user_id == user_id)
    if unread_only:
        query = query.filter(models.AIInsight.is_read == False)
    return query.order_by(models.AIInsight.created_at.desc()).all()

def create_insight(db: Session, user_id: int, title: str, description: str, type: str):
    db_insight = models.AIInsight(
        user_id=user_id,
        title=title,
        description=description,
        type=type
    )
    db.add(db_insight)
    db.commit()
    db.refresh(db_insight)
    return db_insight

def mark_insight_read(db: Session, insight_id: int, user_id: int):
    db_insight = db.query(models.AIInsight).filter(
        models.AIInsight.id == insight_id,
        models.AIInsight.user_id == user_id
    ).first()
    if db_insight:
        db_insight.is_read = True
        db.commit()
        db.refresh(db_insight)
        return db_insight
    return None
