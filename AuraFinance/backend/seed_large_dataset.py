import os
import sys
import random
from datetime import datetime, date, timedelta

# Add parent directory to sys.path to import app modules correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import db, models, crud, schemas
from app.ml.anomaly import detect_anomaly

def seed_large_dataset(num_users=100):
    print("=" * 60)
    print(f"SEEDING LARGE DATASET: {num_users} USERS & HISTORICAL DATA")
    print("=" * 60)
    
    session = next(db.get_db())
    
    # Re-create tables if they don't exist
    models.Base.metadata.create_all(bind=db.engine)
    
    # Clean up any existing large-scale test users to prevent duplicate seeding bloat
    large_emails = [f"user_{i}@example.com" for i in range(1, num_users + 1)]
    print("Cleaning up old large-scale user profiles...")
    session.query(models.User).filter(models.User.email.in_(large_emails)).delete(synchronize_session=False)
    session.commit()
    
    personas = ["balanced", "investor", "impulsive", "saver"]
    
    users_to_add = []
    budgets_to_add = []
    transactions_to_add = []
    
    start_date = date.today() - timedelta(days=365)
    end_date = date.today()
    
    print(f"Generating data for {num_users} users in memory...")
    
    for i in range(1, num_users + 1):
        email = f"user_{i}@example.com"
        persona = random.choice(personas)
        
        # Create user
        hashed_pwd = crud.get_password_hash("password123")
        db_user = models.User(email=email, hashed_password=hashed_pwd, spending_personality="Unclassified")
        session.add(db_user)
        session.flush() # Flush to populate db_user.id
        
        # 1. Budgets for user (based on persona)
        budget_settings = {}
        if persona == "balanced":
            budget_settings = {"Food": 25000.0, "Utilities": 12000.0, "Entertainment": 15000.0, "Investment": 30000.0, "Shopping": 20000.0, "Housing": 35000.0, "Travel": 15000.0, "Debt": 15000.0}
        elif persona == "investor":
            budget_settings = {"Food": 20000.0, "Utilities": 12000.0, "Entertainment": 10000.0, "Investment": 120000.0, "Shopping": 10000.0, "Housing": 30000.0, "Travel": 10000.0, "Debt": 10000.0}
        elif persona == "impulsive":
            budget_settings = {"Food": 45000.0, "Utilities": 12000.0, "Entertainment": 40000.0, "Investment": 5000.0, "Shopping": 50000.0, "Housing": 35000.0, "Travel": 30000.0, "Debt": 25000.0}
        elif persona == "saver":
            budget_settings = {"Food": 15000.0, "Utilities": 9000.0, "Entertainment": 5000.0, "Investment": 180000.0, "Shopping": 5000.0, "Housing": 25000.0, "Travel": 5000.0, "Debt": 5000.0}
            
        for cat, amt in budget_settings.items():
            db_budget = models.Budget(user_id=db_user.id, category=cat, amount=amt, month=5, year=2026)
            budgets_to_add.append(db_budget)
            
        # 2. 12 Months of Transactions
        temp_date = start_date
        user_txs = []
        
        # Monthly base params
        income_amt = 180000.0
        if persona == "saver": income_amt = 320000.0
        elif persona == "investor": income_amt = 260000.0
        elif persona == "impulsive": income_amt = 150000.0
        
        # Scale with slight variation per user to make clustering interesting
        user_scale = random.uniform(0.9, 1.1)
        income_amt *= user_scale
        
        while temp_date <= end_date:
            salary_date = date(temp_date.year, temp_date.month, 1)
            if salary_date >= start_date and salary_date <= end_date:
                user_txs.append({
                    "date": salary_date, "description": "Salary Paycheck Direct Dep", 
                    "amount": income_amt, "category": "Income", "type": "credit"
                })
                
            rent_amt = (32000.0 if persona != "saver" else 22000.0) * user_scale
            rent_date = date(temp_date.year, temp_date.month, 2)
            if rent_date >= start_date and rent_date <= end_date:
                user_txs.append({
                    "date": rent_date, "description": "Rental Apartment Fee", 
                    "amount": rent_amt, "category": "Housing", "type": "debit"
                })
                
            bill_amt = (6500.0 if persona != "saver" else 4800.0) * user_scale
            bill_date = date(temp_date.year, temp_date.month, 5)
            if bill_date >= start_date and bill_date <= end_date:
                user_txs.append({
                    "date": bill_date, "description": "Monthly Fiber & Power Bill", 
                    "amount": bill_amt, "category": "Utilities", "type": "debit"
                })
                
            invest_amt = 25000.0
            if persona == "saver": invest_amt = 160000.0
            elif persona == "investor": invest_amt = 100000.0
            elif persona == "impulsive": invest_amt = 2000.0
            invest_amt *= user_scale
            
            inv_date = date(temp_date.year, temp_date.month, 10)
            if inv_date >= start_date and inv_date <= end_date:
                user_txs.append({
                    "date": inv_date, "description": "Auto MF Mutual Fund SIP", 
                    "amount": invest_amt, "category": "Investment", "type": "debit"
                })
                
            # Weekly expenses
            groceries_min, groceries_max = 3500.0, 6000.0
            dining_count = 2
            dining_min, dining_max = 800.0, 2500.0
            shopping_min, shopping_max = 2000.0, 8000.0
            ent_min, ent_max = 1500.0, 4500.0
            
            if persona == "saver":
                groceries_min, groceries_max = 2000.0, 4000.0
                dining_count = 0
                shopping_min, shopping_max = 0.0, 2000.0
                ent_min, ent_max = 500.0, 1500.0
            elif persona == "impulsive":
                groceries_min, groceries_max = 4500.0, 8500.0
                dining_count = 4
                dining_min, dining_max = 1500.0, 6000.0
                shopping_min, shopping_max = 8000.0, 35000.0
                ent_min, ent_max = 4000.0, 15000.0
                
            for week in range(4):
                week_offset = week * 7
                
                # Food
                g_date = temp_date + timedelta(days=week_offset + random.randint(0, 2))
                if g_date >= start_date and g_date <= end_date:
                    user_txs.append({
                        "date": g_date, "description": "Grocery Supermarket Purchase",
                        "amount": round(random.uniform(groceries_min, groceries_max) * user_scale, 2),
                        "category": "Food", "type": "debit"
                    })
                    
                # Dining
                for _ in range(dining_count):
                    d_date = temp_date + timedelta(days=week_offset + random.randint(3, 6))
                    if d_date >= start_date and d_date <= end_date:
                        user_txs.append({
                            "date": d_date, "description": random.choice(["Chipotle Grill", "Corner Bistro", "Sushi Bar", "Zomato Delivery"]),
                            "amount": round(random.uniform(dining_min, dining_max) * user_scale, 2),
                            "category": "Food", "type": "debit"
                        })
                        
                # Shopping
                if week == 2 and shopping_max > 0:
                    s_date = temp_date + timedelta(days=week_offset + 3)
                    if s_date >= start_date and s_date <= end_date:
                        user_txs.append({
                            "date": s_date, "description": "Retail Brand Shopping",
                            "amount": round(random.uniform(shopping_min, shopping_max) * user_scale, 2),
                            "category": "Shopping", "type": "debit"
                        })
                        
                # Entertainment
                e_date = temp_date + timedelta(days=week_offset + random.randint(4, 6))
                if e_date >= start_date and e_date <= end_date:
                    user_txs.append({
                        "date": e_date, "description": "Cinema / Concert / Pub Ticket",
                        "amount": round(random.uniform(ent_min, ent_max) * user_scale, 2),
                        "category": "Entertainment", "type": "debit"
                    })
                    
                # Travel
                t_date = temp_date + timedelta(days=week_offset + random.randint(1, 5))
                if t_date >= start_date and t_date <= end_date:
                    user_txs.append({
                        "date": t_date, "description": "Cab ride / Fuel pump payment",
                        "amount": round(random.uniform(1200.0, 3200.0) * user_scale, 2),
                        "category": "Travel", "type": "debit"
                    })
                    
            # Next month
            if temp_date.month == 12:
                temp_date = date(temp_date.year + 1, 1, 1)
            else:
                temp_date = date(temp_date.year, temp_date.month + 1, 1)
                
        # Transform items into SQLAlchemy models
        for tx in user_txs:
            db_tx = models.Transaction(
                user_id=db_user.id,
                date=tx["date"],
                description=tx["description"],
                amount=tx["amount"],
                category=tx["category"],
                type=tx["type"],
                is_anomaly=False,
                anomaly_score=0.0
            )
            transactions_to_add.append(db_tx)
            
    print(f"Bulk saving {len(budgets_to_add)} budgets and {len(transactions_to_add)} transactions...")
    session.add_all(budgets_to_add)
    session.add_all(transactions_to_add)
    session.commit()
    session.close()
    
    print("\nLarge-scale seeding completed successfully!")
    
    # Run the model training script to see the new metrics
    from train_models import train_and_save_models
    train_and_save_models()

if __name__ == "__main__":
    users_count = 100
    if len(sys.argv) > 1:
        try:
            users_count = int(sys.argv[1])
        except ValueError:
            pass
    seed_large_dataset(users_count)
