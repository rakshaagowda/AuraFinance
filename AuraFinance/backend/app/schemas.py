from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime, date
from typing import List, Optional

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    spending_personality: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Transaction Schemas
class TransactionBase(BaseModel):
    date: date
    description: str
    amount: float
    category: str
    type: str # debit or credit

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    is_anomaly: bool
    anomaly_score: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Budget Schemas
class BudgetBase(BaseModel):
    category: str
    amount: float
    month: int
    year: int

class BudgetCreate(BudgetBase):
    pass

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Subscription Schemas
class SubscriptionBase(BaseModel):
    merchant: str
    amount: float
    category: str
    periodicity: str # Weekly, Monthly, Yearly
    next_billing_date: date
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionResponse(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# AIInsight Schemas
class AIInsightResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    type: str # warning, suggestion, tip
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ML Analytics Responses
class CategorySpend(BaseModel):
    category: str
    amount: float
    percentage: float

class DailySpend(BaseModel):
    date: date
    amount: float

class DashboardOverview(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    savings_rate: float
    recent_transactions: List[TransactionResponse]
    insights: List[AIInsightResponse]

class ForecastPoint(BaseModel):
    period: str # e.g. "Jun 2026"
    predicted_amount: float
    lower_bound: float
    upper_bound: float

class SpendForecastResponse(BaseModel):
    history: List[dict] # month-year and amount
    forecast: List[ForecastPoint]
    trend: str # "increasing", "decreasing", "stable"
    test_r2: Optional[float] = None
    test_rmse: Optional[float] = None
    train_r2: Optional[float] = None
    train_rmse: Optional[float] = None
    trained_on_months: Optional[int] = None
    model_formula: Optional[str] = None
    is_locally_trained: Optional[bool] = False

class HealthSubScores(BaseModel):
    savings_score: float
    budgeting_efficiency: float
    debt_risk: float
    overspending_risk: float

class HealthScoreResponse(BaseModel):
    score: int # 0-100
    grade: str # A, B, C, D, F
    breakdown: HealthSubScores
    recommendations: List[str]

class PersonalityResponse(BaseModel):
    personality: str
    description: str
    traits: List[str]
    category_radar: List[dict] # category and proportion
    train_inertia: Optional[float] = None
    test_inertia: Optional[float] = None
    train_users_count: Optional[int] = None
    test_users_count: Optional[int] = None
    is_locally_trained: Optional[bool] = False
    user_vector: Optional[List[float]] = None
    centroids: Optional[dict] = None
    distances: Optional[dict] = None
