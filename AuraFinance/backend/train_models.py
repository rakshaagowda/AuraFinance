import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Add parent directory to sys.path to import app modules correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import db, models, crud

SAVED_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "ml", "saved_models")
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

REFERENCE_CENTROIDS = {
    "Disciplined Saver": np.array([0.40, 0.10, 0.20, 0.30]),
    "Impulsive Spender": np.array([0.05, 0.02, 0.60, 0.33]),
    "Strategic Investor": np.array([0.25, 0.45, 0.15, 0.15]),
    "Balanced Budgeter": np.array([0.20, 0.10, 0.30, 0.40]),
}

def train_and_save_models():
    print("=" * 60)
    print("STARTING LOCAL ML MODEL TRAINING PIPELINE")
    print("=" * 60)
    
    session = next(db.get_db())
    
    try:
        # Fetch all users
        users = session.query(models.User).all()
        print(f"Found {len(users)} users in database.")
        
        # 1. TRAIN CLUSTERING MODEL (K-MEANS)
        user_features = []
        user_ids = []
        user_emails = []
        clust_rows = []
        
        for user in users:
            # Retrieve all transactions for user
            txs = crud.get_transactions(session, user_id=user.id, limit=5000)
            if len(txs) < 5:
                continue
                
            df = pd.DataFrame([{"amount": tx.amount, "category": tx.category, "type": tx.type} for tx in txs])
            debits = df[df["type"] == "debit"]
            credits = df[df["type"] == "credit"]
            
            total_income = credits["amount"].sum() if not credits.empty else 0.0
            total_spend = debits["amount"].sum() if not debits.empty else 0.0
            
            if total_spend == 0:
                continue
                
            # Compute category proportions
            category_totals = debits.groupby("category")["amount"].sum()
            categories = ["Food", "Utilities", "Entertainment", "Investment", "Shopping", "Housing", "Travel"]
            proportions = {}
            for cat in categories:
                proportions[cat] = float(category_totals.get(cat, 0.0) / total_spend)
                
            savings_rate = 0.0
            if total_income > 0:
                savings_rate = max(0.0, (total_income - total_spend) / total_income)
                
            discretionary_prop = proportions["Entertainment"] + proportions["Shopping"] + proportions["Food"]
            essentials_prop = proportions["Housing"] + proportions["Utilities"]
            invest_prop = proportions["Investment"]
            
            features = np.array([savings_rate, invest_prop, discretionary_prop, essentials_prop])
            user_features.append(features)
            user_ids.append(user.id)
            user_emails.append(user.email)
            clust_rows.append({
                "user_id": user.id,
                "email": user.email,
                "savings_rate": float(savings_rate),
                "invest_prop": float(invest_prop),
                "discretionary_prop": float(discretionary_prop),
                "essentials_prop": float(essentials_prop)
            })
            
        if len(user_features) >= 1:
            X_clust = np.array(user_features)
            n_clusters = min(4, len(user_features))
            
            # Split dataset if we have enough users (at least 5 users for a 80/20 train/test split)
            if len(X_clust) >= 5:
                X_train, X_test = train_test_split(X_clust, test_size=0.20, random_state=42)
                print(f"\nClustering Train/Test split: Train={len(X_train)} users, Test={len(X_test)} users.")
            else:
                X_train, X_test = X_clust, None
                print(f"\nDatabase too small for train/test split (only {len(X_clust)} users). Training K-Means on all data.")
                
            print(f"Training KMeans with {n_clusters} clusters...")
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            kmeans.fit(X_train)
            
            # Map trained centroids to original reference profiles using Euclidean distance
            cluster_centers = kmeans.cluster_centers_
            cluster_to_personality = {}
            available_personalities = list(REFERENCE_CENTROIDS.keys())
            
            for c_idx in range(n_clusters):
                center = cluster_centers[c_idx]
                best_personality = min(available_personalities, key=lambda p: np.linalg.norm(center - REFERENCE_CENTROIDS[p]))
                cluster_to_personality[c_idx] = best_personality
                if len(available_personalities) > 1:
                    available_personalities.remove(best_personality)
            
            # Evaluate Clustering for saving
            train_inertia_val = float(kmeans.inertia_)
            test_inertia_val = None
            if X_test is not None:
                test_inertia_val = float(-kmeans.score(X_test))
                
            # Save KMeans clustering model
            model_path = os.path.join(SAVED_MODELS_DIR, "kmeans_model.pkl")
            with open(model_path, "wb") as f:
                pickle.dump({
                    "model": kmeans,
                    "cluster_to_personality": cluster_to_personality,
                    "reference_centroids": REFERENCE_CENTROIDS,
                    "train_inertia": train_inertia_val,
                    "test_inertia": test_inertia_val,
                    "train_users_count": int(len(X_train)),
                    "test_users_count": int(len(X_test)) if X_test is not None else 0,
                    "is_locally_trained": True
                }, f)
            print(f"KMeans clustering model saved to: {model_path}")
            
            # Evaluate Clustering
            print("\n--- KMeans Evaluation ---")
            print(f"  Training Inertia (Sum of squared distances): {kmeans.inertia_:.4f}")
            if X_test is not None:
                # kmeans.score returns negative inertia values
                test_inertia = -kmeans.score(X_test)
                print(f"  Testing Inertia (On unseen test users):     {test_inertia:.4f}")
            
            for c_idx, center in enumerate(cluster_centers):
                assigned_name = cluster_to_personality[c_idx]
                print(f"  Cluster {c_idx} Centroid: Savings={center[0]:.2f}, Invest={center[1]:.2f}, Discretionary={center[2]:.2f}, Essentials={center[3]:.2f} -> Class: {assigned_name}")
                
            # Update users' personalities in the database and enrich dataset
            for idx, user_id in enumerate(user_ids):
                user_feat = X_clust[idx].reshape(1, -1)
                predicted_cluster = kmeans.predict(user_feat)[0]
                personality = cluster_to_personality[predicted_cluster]
                crud.update_user_personality(session, user_id=user_id, personality=personality)
                print(f"User {user_emails[idx]} mapped to personality: {personality}")
                
            for row in clust_rows:
                feat = np.array([row["savings_rate"], row["invest_prop"], row["discretionary_prop"], row["essentials_prop"]]).reshape(1, -1)
                pred_c = kmeans.predict(feat)[0]
                row["assigned_personality"] = cluster_to_personality[pred_c]
                
            df_clust_dataset = pd.DataFrame(clust_rows)
            df_clust_dataset.to_csv("c:/Projects/ML/clustering_dataset.csv", index=False)
            print("\nClustering training dataset exported to: c:/Projects/ML/clustering_dataset.csv")
        else:
            print(f"\nInsufficient users to train KMeans (found {len(user_features)} users). Skipping KMeans training.")
            
        # 2. TRAIN FORECASTING MODELS (LINEAR REGRESSION PER USER)
        print("\n" + "-" * 50)
        print("Training Linear Regression spending forecast models per user...")
        print("-" * 50)
        
        fore_rows = []
        for user in users:
            txs = crud.get_transactions(session, user_id=user.id, limit=5000)
            debits = [tx for tx in txs if tx.type == "debit"]
            if not debits:
                continue
                
            df_tx = pd.DataFrame([{"date": pd.to_datetime(tx.date), "amount": abs(tx.amount)} for tx in debits])
            df_tx.set_index("date", inplace=True)
            monthly_spend = df_tx.resample("ME")["amount"].sum().reset_index()
            
            n_months = len(monthly_spend)
            if n_months < 3:
                print(f"User {user.email}: Insufficient historical months ({n_months}) for Linear Regression. Skipping.")
                continue
                
            for m_idx, r in monthly_spend.iterrows():
                fore_rows.append({
                    "user_id": user.id,
                    "email": user.email,
                    "month_index": m_idx,
                    "month_year": r["date"].strftime("%B %Y"),
                    "monthly_spending": float(r["amount"])
                })
                
            # Perform temporal train/test split if we have at least 6 months of data
            if n_months >= 6:
                train_size = n_months - 3
                X_train = np.arange(train_size).reshape(-1, 1)
                Y_train = monthly_spend["amount"].values[:train_size]
                
                X_test = np.arange(train_size, n_months).reshape(-1, 1)
                Y_test = monthly_spend["amount"].values[train_size:]
                
                # Train/evaluate on historical split
                eval_model = LinearRegression()
                eval_model.fit(X_train, Y_train)
                
                Y_pred_test = eval_model.predict(X_test)
                test_mse = mean_squared_error(Y_test, Y_pred_test)
                test_r2 = r2_score(Y_test, Y_pred_test)
                
                # Fit final model on ALL data for production forecasting
                X_all = np.arange(n_months).reshape(-1, 1)
                Y_all = monthly_spend["amount"].values
                final_model = LinearRegression()
                final_model.fit(X_all, Y_all)
                
                reg_path = os.path.join(SAVED_MODELS_DIR, f"regression_user_{user.id}.pkl")
                with open(reg_path, "wb") as f:
                    pickle.dump({
                        "model": final_model,
                        "trained_on_months": n_months,
                        "test_r2": float(test_r2),
                        "test_rmse": float(np.sqrt(test_mse)),
                        "model_formula": f"Spending = {final_model.coef_[0]:.2f} * Month + {final_model.intercept_:.2f}",
                        "is_locally_trained": True
                    }, f)
                    
                print(f"User {user.email} (ID: {user.id}) Model Trained:")
                print(f"  Saved to: {reg_path}")
                print(f"  Formula: Spending = {final_model.coef_[0]:.2f} * Month + {final_model.intercept_:.2f}")
                print(f"  Test R-squared (on unseen last 3 months): {test_r2:.4f}")
                print(f"  Test Root MSE (on unseen last 3 months):  Rs. {np.sqrt(test_mse):.2f}")
            else:
                # Fallback: train on all data
                X_all = np.arange(n_months).reshape(-1, 1)
                Y_all = monthly_spend["amount"].values
                
                final_model = LinearRegression()
                final_model.fit(X_all, Y_all)
                
                Y_pred_all = final_model.predict(X_all)
                train_mse = mean_squared_error(Y_all, Y_pred_all)
                train_r2 = r2_score(Y_all, Y_pred_all)
                
                reg_path = os.path.join(SAVED_MODELS_DIR, f"regression_user_{user.id}.pkl")
                with open(reg_path, "wb") as f:
                    pickle.dump({
                        "model": final_model,
                        "trained_on_months": n_months,
                        "train_r2": float(train_r2),
                        "train_rmse": float(np.sqrt(train_mse)),
                        "model_formula": f"Spending = {final_model.coef_[0]:.2f} * Month + {final_model.intercept_:.2f}",
                        "is_locally_trained": True
                    }, f)
                    
                print(f"User {user.email} (ID: {user.id}) Model Trained (Insufficient months for split):")
                print(f"  Saved to: {reg_path}")
                print(f"  Formula: Spending = {final_model.coef_[0]:.2f} * Month + {final_model.intercept_:.2f}")
                print(f"  Train R-squared: {train_r2:.4f}")
                print(f"  Train Root MSE:  Rs. {np.sqrt(train_mse):.2f}")
                
        if fore_rows:
            df_fore_dataset = pd.DataFrame(fore_rows)
            df_fore_dataset.to_csv("c:/Projects/ML/forecasting_dataset.csv", index=False)
            print("\nForecasting training dataset exported to: c:/Projects/ML/forecasting_dataset.csv")
            
    except Exception as e:
        print(f"Error during training: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()
        print("\n" + "=" * 60)
        print("MODEL TRAINING PIPELINE COMPLETED")
        print("=" * 60)

if __name__ == "__main__":
    train_and_save_models()
