import sys
import os
from datetime import datetime, date, timedelta
import random

# Add parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models, crud, db, schemas
from app.ml.anomaly import detect_anomaly
from app.ml.clustering import analyze_spending_personality

def seed_demo_data():
    print("Clearing and re-seeding database with 4 distinct user accounts...")
    session = next(db.get_db())
    
    # Create all tables first
    models.Base.metadata.create_all(bind=db.engine)
    
    # Define users to seed
    users_data = [
        {"email": "demo@example.com", "name": "Demo", "persona": "balanced"},
        {"email": "charles@example.com", "name": "Charles", "persona": "investor"},
        {"email": "lewis@example.com", "name": "Lewis", "persona": "impulsive"},
        {"email": "max@example.com", "name": "Max", "persona": "saver"},
    ]
    
    for u_info in users_data:
        existing_user = crud.get_user_by_email(session, email=u_info["email"])
        if existing_user:
            print(f"Cleaning old transactions for {u_info['email']}...")
            session.delete(existing_user)
            session.commit()
            
        user_in = schemas.UserCreate(email=u_info["email"], password="password123")
        user = crud.create_user(session, user=user_in)
        print(f"Created user: {user.email} (ID: {user.id})")
        
        # 1. Add Budgets matching persona (scaled for Indian Rupees INR)
        budgets = []
        if u_info["persona"] == "balanced":
            budgets = [
                schemas.BudgetCreate(category="Food", amount=25000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Utilities", amount=12000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Entertainment", amount=15000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Investment", amount=30000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Shopping", amount=20000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Housing", amount=35000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Travel", amount=15000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Debt", amount=15000.0, month=5, year=2026),
            ]
        elif u_info["persona"] == "investor":
            budgets = [
                schemas.BudgetCreate(category="Food", amount=20000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Utilities", amount=12000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Entertainment", amount=10000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Investment", amount=120000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Shopping", amount=10000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Housing", amount=30000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Travel", amount=10000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Debt", amount=10000.0, month=5, year=2026),
            ]
        elif u_info["persona"] == "impulsive":
            budgets = [
                schemas.BudgetCreate(category="Food", amount=45000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Utilities", amount=12000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Entertainment", amount=40000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Investment", amount=5000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Shopping", amount=50000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Housing", amount=35000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Travel", amount=30000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Debt", amount=25000.0, month=5, year=2026),
            ]
        elif u_info["persona"] == "saver":
            budgets = [
                schemas.BudgetCreate(category="Food", amount=15000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Utilities", amount=9000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Entertainment", amount=5000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Investment", amount=180000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Shopping", amount=5000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Housing", amount=25000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Travel", amount=5000.0, month=5, year=2026),
                schemas.BudgetCreate(category="Debt", amount=5000.0, month=5, year=2026),
            ]
            
        for b in budgets:
            crud.create_or_update_budget(session, budget=b, user_id=user.id)
            
        # 2. Generate 12 months of Transactions for this user (realistic INR amounts)
        start_date = date.today() - timedelta(days=365)
        end_date = date.today()
        
        temp_date = start_date
        user_txs = []
        
        while temp_date <= end_date:
            # Monthly Income stream (Indian Tech Salaries: ₹1,50,000 - ₹3,50,000/mo)
            income_amt = 180000.0
            if u_info["persona"] == "saver": income_amt = 320000.0
            elif u_info["persona"] == "investor": income_amt = 260000.0
            elif u_info["persona"] == "impulsive": income_amt = 150000.0
            
            salary_date = date(temp_date.year, temp_date.month, 1)
            if salary_date >= start_date and salary_date <= end_date:
                user_txs.append({
                    "date": salary_date, "description": "Corporate Direct Dep", 
                    "amount": income_amt, "category": "Income", "type": "credit"
                })
                
            # Rent expense (Metropolitan Rent: ₹25,000 - ₹45,000)
            rent_amt = 320000.0 / 10 # ₹32,000
            if u_info["persona"] == "saver": rent_amt = 22000.0
            elif u_info["persona"] == "investor": rent_amt = 28000.0
            
            rent_date = date(temp_date.year, temp_date.month, 2)
            if rent_date >= start_date and rent_date <= end_date:
                user_txs.append({
                    "date": rent_date, "description": "Urban Residency Flat Rent", 
                    "amount": rent_amt, "category": "Housing", "type": "debit"
                })
                
            # Utilities bills (Internet, Electricity, Water)
            bill_date = date(temp_date.year, temp_date.month, 5)
            if bill_date >= start_date and bill_date <= end_date:
                user_txs.append({
                    "date": bill_date, "description": "State Power & Fiber Internet", 
                    "amount": 6500.0 if u_info["persona"] != "saver" else 4800.0, "category": "Utilities", "type": "debit"
                })
                
            # Investments (Mutual Funds, SIP, Stocks)
            invest_amt = 25000.0
            if u_info["persona"] == "saver": invest_amt = 160000.0
            elif u_info["persona"] == "investor": invest_amt = 100000.0
            elif u_info["persona"] == "impulsive": invest_amt = 2000.0
            
            inv_date = date(temp_date.year, temp_date.month, 10)
            if inv_date >= start_date and inv_date <= end_date and invest_amt > 0:
                user_txs.append({
                    "date": inv_date, "description": "Zerodha MF SIP Investment", 
                    "amount": invest_amt, "category": "Investment", "type": "debit"
                })
                
            # Subscriptions (Netflix: ₹649, Spotify Premium: ₹119)
            sub_sp = date(temp_date.year, temp_date.month, 12)
            if sub_sp >= start_date and sub_sp <= end_date:
                user_txs.append({
                    "date": sub_sp, "description": "Spotify Premium Subscription", 
                    "amount": 119.00, "category": "Entertainment", "type": "debit"
                })
                
            if u_info["persona"] == "impulsive":
                # Impulsive spenders have Netflix Premium, Hotstar, Gym, etc.
                sub_nf = date(temp_date.year, temp_date.month, 18)
                if sub_nf >= start_date and sub_nf <= end_date:
                    user_txs.append({
                        "date": sub_nf, "description": "Netflix Premium 4K", 
                        "amount": 649.00, "category": "Entertainment", "type": "debit"
                    })
                sub_hulu = date(temp_date.year, temp_date.month, 22)
                if sub_hulu >= start_date and sub_hulu <= end_date:
                    user_txs.append({
                        "date": sub_hulu, "description": "Gold's Gym Membership", 
                        "amount": 2999.00, "category": "Entertainment", "type": "debit"
                    })
            else:
                # Other spenders have standard Netflix
                sub_nf = date(temp_date.year, temp_date.month, 18)
                if sub_nf >= start_date and sub_nf <= end_date:
                    user_txs.append({
                        "date": sub_nf, "description": "Netflix Premium 4K", 
                        "amount": 649.00, "category": "Entertainment", "type": "debit"
                    })
                    
            # Weekly expenses variables based on persona (scaled to realistic INR)
            groceries_min, groceries_max = 3500.0, 6000.0
            dining_count = 2
            dining_min, dining_max = 800.0, 2500.0
            shopping_min, shopping_max = 2000.0, 8000.0
            ent_min, ent_max = 1500.0, 4500.0
            
            if u_info["persona"] == "saver":
                groceries_min, groceries_max = 2000.0, 4000.0
                dining_count = 0
                shopping_min, shopping_max = 0.0, 2000.0
                ent_min, ent_max = 500.0, 1500.0
            elif u_info["persona"] == "impulsive":
                groceries_min, groceries_max = 4500.0, 8500.0
                dining_count = 5
                dining_min, dining_max = 1500.0, 6000.0
                shopping_min, shopping_max = 8000.0, 35000.0
                ent_min, ent_max = 4000.0, 15000.0
                
            for week in range(4):
                week_offset = week * 7
                
                # Groceries (BigBasket, Zepto, Nature's Basket)
                groceries_date = temp_date + timedelta(days=week_offset + random.randint(0, 2))
                if groceries_date >= start_date and groceries_date <= end_date:
                    user_txs.append({
                        "date": groceries_date, "description": random.choice(["BigBasket Grocery", "Nature's Basket", "Zepto Delivery"]),
                        "amount": round(random.uniform(groceries_min, groceries_max), 2), "category": "Food", "type": "debit"
                    })
                    
                # Dining (Starbucks Coffee at ~₹350, Zomato, Restaurant dining)
                for _ in range(dining_count):
                    dining_date = temp_date + timedelta(days=week_offset + random.randint(3, 6))
                    if dining_date >= start_date and dining_date <= end_date:
                        user_txs.append({
                            "date": dining_date, "description": random.choice(["Starbucks Coffee", "Chipotle Grill", "Corner Bistro", "Sushi House"]),
                            "amount": round(random.uniform(320.0, 450.0) if random.random() > 0.4 else random.uniform(dining_min, dining_max), 2), "category": "Food", "type": "debit"
                        })
                        
                # Shopping (Myntra, Amazon.in, Zara)
                if week == 2 and shopping_max > 0:
                    shop_date = temp_date + timedelta(days=week_offset + 3)
                    if shop_date >= start_date and shop_date <= end_date:
                        user_txs.append({
                            "date": shop_date, "description": random.choice(["Zara India", "Myntra Shopping", "Amazon.in Services"]),
                            "amount": round(random.uniform(shopping_min, shopping_max), 2), "category": "Shopping", "type": "debit"
                        })
                        
                # Entertainment
                ent_date = temp_date + timedelta(days=week_offset + random.randint(4, 6))
                if ent_date >= start_date and ent_date <= end_date:
                    user_txs.append({
                        "date": ent_date, "description": random.choice(["PVR Cinema tickets", "The Local Brewery", "Social Pub", "BookMyShow Concert"]),
                        "amount": round(random.uniform(ent_min, ent_max), 2), "category": "Entertainment", "type": "debit"
                    })
                    
                # Travel (Ola/Uber charges, Fuel)
                travel_date = temp_date + timedelta(days=week_offset + random.randint(1, 5))
                if travel_date >= start_date and travel_date <= end_date:
                    user_txs.append({
                        "date": travel_date, "description": random.choice(["Shell Oil Fuel", "Uber India rides", "Ola Cabs payment"]),
                        "amount": round(random.uniform(1200.0, 3200.0), 2), "category": "Travel", "type": "debit"
                    })
                    
            # Move to next month
            if temp_date.month == 12:
                temp_date = date(temp_date.year + 1, 1, 1)
            else:
                temp_date = date(temp_date.year, temp_date.month + 1, 1)
                
        # Insert baseline transactions into DB
        user_txs.sort(key=lambda x: x["date"])
        db_transactions = []
        for tx in user_txs:
            db_tx = models.Transaction(
                user_id=user.id,
                date=tx["date"],
                description=tx["description"],
                amount=tx["amount"],
                category=tx["category"],
                type=tx["type"],
                is_anomaly=False,
                anomaly_score=0.0
            )
            session.add(db_tx)
            db_transactions.append(db_tx)
            
        session.commit()
        
        # 3. Add anomalous transactions specifically for this user
        anomaly1_date = date.today() - timedelta(days=15)
        anomaly2_date = date.today() - timedelta(days=3)
        
        anomalies = []
        if u_info["persona"] == "balanced" or u_info["persona"] == "investor":
            anomalies = [
                {"date": anomaly1_date, "description": "Luxury Watch Boutique", "amount": 135000.00, "category": "Shopping", "type": "debit"},
                {"date": anomaly2_date, "description": "High-End Prime Steakhouse", "amount": 12500.00, "category": "Food", "type": "debit"},
            ]
        elif u_info["persona"] == "saver":
            # For a saver, a ₹45k purchase at "Tech Store" is a massive anomaly
            anomalies = [
                {"date": anomaly1_date, "description": "Tech Store Purchase", "amount": 45000.00, "category": "Shopping", "type": "debit"},
            ]
        elif u_info["persona"] == "impulsive":
            # An impulsive spender spends highly everywhere, but we trigger a massive ₹2,80,000 travel anomaly
            anomalies = [
                {"date": anomaly1_date, "description": "First Class Flight Ticket", "amount": 280000.00, "category": "Travel", "type": "debit"},
            ]
            
        for anom in anomalies:
            is_anom, score = detect_anomaly(anom["amount"], anom["category"], anom["date"], db_transactions)
            db_anom = models.Transaction(
                user_id=user.id,
                date=anom["date"],
                description=anom["description"],
                amount=anom["amount"],
                category=anom["category"],
                type=anom["type"],
                is_anomaly=is_anom,
                anomaly_score=score
            )
            session.add(db_anom)
            
            if is_anom:
                crud.create_insight(
                    session,
                    user_id=user.id,
                    title="Unusual Spend Flagged",
                    description=f"An anomalous transaction of ₹{anom['amount']} in category '{anom['category']}' was detected on {anom['date']}. Review this entry to ensure it was authorized.",
                    type="warning"
                )
        session.commit()
        
        # 4. Train and save personality
        all_tx = crud.get_transactions(session, user_id=user.id, limit=2000)
        p_res = analyze_spending_personality(all_tx)
        print(f"User {u_info['email']} classified as: {p_res['personality']}")
        crud.update_user_personality(session, user_id=user.id, personality=p_res["personality"])
        
    session.close()
    print("Database seeding for multiple users completed successfully!")

if __name__ == "__main__":
    seed_demo_data()
