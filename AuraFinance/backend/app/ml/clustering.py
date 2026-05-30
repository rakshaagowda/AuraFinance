import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from typing import List, Dict, Any
from app import models

# Define the personalities and their characteristics
PERSONALITIES = {
    0: {
        "name": "Disciplined Saver",
        "description": "You prioritize saving and long-term financial security. You maintain tight control over discretionary spending.",
        "traits": ["High savings rate", "Minimal impulse purchases", "Predictable monthly cash flow", "Low utility-to-saving ratio"]
    },
    1: {
        "name": "Impulsive Spender",
        "description": "You love living in the moment, which often reflects in frequent, high discretionary spending on entertainment and shopping.",
        "traits": ["High dining and leisure spend", "Frequent small transactions", "Low savings rate", "Vulnerable to monthly budget overruns"]
    },
    2: {
        "name": "Strategic Investor",
        "description": "You actively allocate a significant portion of your income into investments, stocks, and wealth-building assets.",
        "traits": ["High investment allocation", "Moderate essentials spend", "Focused on net worth growth", "Calculated risk-taker"]
    },
    3: {
        "name": "Balanced Budgeter",
        "description": "You maintain a healthy equilibrium between enjoying life today and preparing for tomorrow, sticking closely to your limits.",
        "traits": ["Adherence to 50/30/20 rule", "Stable category proportions", "Low debt accumulation", "Consistent saving behavior"]
    }
}

import os
import pickle
from app.db import SessionLocal

SAVED_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "saved_models")
MODEL_PATH = os.path.join(SAVED_MODELS_DIR, "kmeans_model.pkl")

def analyze_spending_personality(transactions: List[models.Transaction]) -> Dict[str, Any]:
    """
    Analyzes historical transactions of a user and classifies them into a spending personality.
    Uses K-Means clustering when data is sufficient, otherwise falls back to a rule-based classifier.
    """
    if len(transactions) < 5:
        # Fallback for new users
        return {
            "personality": "Balanced Budgeter (Draft)",
            "description": "We need at least 5 transactions to classify your spending style accurately. Start logging your expenses!",
            "traits": ["Awaiting more transaction data..."],
            "category_radar": []
        }
    
    # Convert transactions to a pandas DataFrame
    df = pd.DataFrame([
        {
            "amount": tx.amount,
            "category": tx.category,
            "type": tx.type
        } for tx in transactions
    ])
    
    # Separate debit and credit
    debits = df[df["type"] == "debit"]
    credits = df[df["type"] == "credit"]
    
    total_income = credits["amount"].sum() if not credits.empty else 0.0
    total_spend = debits["amount"].sum() if not debits.empty else 0.0
    
    # Avoid division by zero
    if total_spend == 0:
        return {
            "personality": "Disciplined Saver",
            "description": "No debit transactions recorded. Your savings rate is essentially 100%!",
            "traits": ["Zero active spending", "Maximum accumulation"],
            "category_radar": []
        }
    
    # Calculate category proportions
    category_totals = debits.groupby("category")["amount"].sum()
    categories = ["Food", "Utilities", "Entertainment", "Investment", "Shopping", "Housing", "Travel"]
    proportions = {}
    for cat in categories:
        proportions[cat] = float(category_totals.get(cat, 0.0) / total_spend)
    
    # Calculate Savings Rate
    savings_rate = 0.0
    if total_income > 0:
        savings_rate = max(0.0, (total_income - total_spend) / total_income)
    
    # Feature engineering for the user:
    # 1. Savings Rate
    # 2. Investment Proportion
    # 3. Discretionary Spend Proportion (Entertainment + Shopping + Food)
    # 4. Essentials Proportion (Housing + Utilities)
    discretionary_prop = proportions["Entertainment"] + proportions["Shopping"] + proportions["Food"]
    essentials_prop = proportions["Housing"] + proportions["Utilities"]
    invest_prop = proportions["Investment"]
    
    # Construct feature vector
    features = np.array([savings_rate, invest_prop, discretionary_prop, essentials_prop])
    
    user_vector = [float(x) for x in features]
    centroids_dict = {}
    distances_dict = {}
    
    # Attempt to load locally trained model
    kmeans = None
    cluster_to_personality = None
    personality_data = None
    
    train_inertia = None
    test_inertia = None
    train_users_count = None
    test_users_count = None
    is_locally_trained = False
    
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                saved_data = pickle.load(f)
                kmeans = saved_data["model"]
                cluster_to_personality = saved_data["cluster_to_personality"]
                train_inertia = saved_data.get("train_inertia")
                test_inertia = saved_data.get("test_inertia")
                train_users_count = saved_data.get("train_users_count")
                test_users_count = saved_data.get("test_users_count")
                is_locally_trained = saved_data.get("is_locally_trained", False)
        except Exception as e:
            print(f"Error loading saved KMeans model: {e}")
            
    # Dynamic training/fallback if model not loaded
    if kmeans is not None and cluster_to_personality is not None:
        try:
            predicted_cluster = kmeans.predict(features.reshape(1, -1))[0]
            personality_name = cluster_to_personality[predicted_cluster]
            personality_data = next((v for v in PERSONALITIES.values() if v["name"] == personality_name), PERSONALITIES[3])
            
            # Compute live distances and centroids mapping
            for idx, center in enumerate(kmeans.cluster_centers_):
                p_name = cluster_to_personality[idx]
                centroids_dict[p_name] = [float(x) for x in center]
                distances_dict[p_name] = float(np.linalg.norm(features - center))
        except Exception as e:
            print(f"Error predicting with saved KMeans model: {e}")
            kmeans = None # force fallback
            
    if kmeans is None or cluster_to_personality is None:
        # Fallback 1: Dynamic K-Means if >= 4 users exist in database
        db_trained = False
        db = SessionLocal()
        try:
            users = db.query(models.User).all()
            if len(users) >= 1:
                user_features = []
                for u in users:
                    txs = u.transactions
                    if len(txs) < 5:
                        continue
                    df_u = pd.DataFrame([{"amount": tx.amount, "category": tx.category, "type": tx.type} for tx in txs])
                    debits_u = df_u[df_u["type"] == "debit"]
                    credits_u = df_u[df_u["type"] == "credit"]
                    if debits_u.empty:
                        continue
                    u_total_spend = debits_u["amount"].sum()
                    u_total_income = credits_u["amount"].sum() if not credits_u.empty else 0.0
                    
                    u_category_totals = debits_u.groupby("category")["amount"].sum()
                    u_categories = ["Food", "Utilities", "Entertainment", "Investment", "Shopping", "Housing", "Travel"]
                    u_proportions = {cat: float(u_category_totals.get(cat, 0.0) / u_total_spend) for cat in u_categories}
                    
                    u_savings_rate = 0.0
                    if u_total_income > 0:
                        u_savings_rate = max(0.0, (u_total_income - u_total_spend) / u_total_income)
                        
                    u_discretionary = u_proportions["Entertainment"] + u_proportions["Shopping"] + u_proportions["Food"]
                    u_essentials = u_proportions["Housing"] + u_proportions["Utilities"]
                    u_invest = u_proportions["Investment"]
                    
                    user_features.append(np.array([u_savings_rate, u_invest, u_discretionary, u_essentials]))
                
                if len(user_features) >= 1:
                    X_clust = np.array(user_features)
                    n_clusters = min(4, len(user_features))
                    kmeans_dyn = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                    kmeans_dyn.fit(X_clust)
                    
                    cluster_centers = kmeans_dyn.cluster_centers_
                    mapping = {}
                    available_personalities = [
                        "Disciplined Saver",
                        "Impulsive Spender",
                        "Strategic Investor",
                        "Balanced Budgeter"
                    ]
                    for c_idx in range(n_clusters):
                        center = cluster_centers[c_idx]
                        ref_centroids_dict = {
                            "Disciplined Saver": np.array([0.40, 0.10, 0.20, 0.30]),
                            "Impulsive Spender": np.array([0.05, 0.02, 0.60, 0.33]),
                            "Strategic Investor": np.array([0.25, 0.45, 0.15, 0.15]),
                            "Balanced Budgeter": np.array([0.20, 0.10, 0.30, 0.40]),
                        }
                        best_p = min(available_personalities, key=lambda p: np.linalg.norm(center - ref_centroids_dict[p]))
                        mapping[c_idx] = best_p
                        if len(available_personalities) > 1:
                            available_personalities.remove(best_p)
                            
                    train_inertia = float(kmeans_dyn.inertia_)
                    train_users_count = int(len(X_clust))
                    is_locally_trained = True
                    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
                    with open(MODEL_PATH, "wb") as f:
                        pickle.dump({
                            "model": kmeans_dyn,
                            "cluster_to_personality": mapping,
                            "reference_centroids": {
                                "Disciplined Saver": np.array([0.40, 0.10, 0.20, 0.30]),
                                "Impulsive Spender": np.array([0.05, 0.02, 0.60, 0.33]),
                                "Strategic Investor": np.array([0.25, 0.45, 0.15, 0.15]),
                                "Balanced Budgeter": np.array([0.20, 0.10, 0.30, 0.40]),
                            },
                            "train_inertia": train_inertia,
                            "train_users_count": train_users_count,
                            "is_locally_trained": True
                        }, f)
                    
                    pred_c = kmeans_dyn.predict(features.reshape(1, -1))[0]
                    p_name = mapping[pred_c]
                    personality_data = next((v for v in PERSONALITIES.values() if v["name"] == p_name), PERSONALITIES[3])
                    db_trained = True
                    
                    # Compute live distances and centroids mapping
                    for idx, center in enumerate(cluster_centers):
                        p_name_dyn = mapping[idx]
                        centroids_dict[p_name_dyn] = [float(x) for x in center]
                        distances_dict[p_name_dyn] = float(np.linalg.norm(features - center))
        except Exception as ex:
            print(f"Error during dynamic fallback training: {ex}")
        finally:
            db.close()
            
        if not db_trained:
            # Fallback 2: Hardcoded reference centroid matching
            centroids = {
                0: np.array([0.40, 0.10, 0.20, 0.30]), # Disciplined Saver
                1: np.array([0.05, 0.02, 0.60, 0.33]), # Impulsive Spender
                2: np.array([0.25, 0.45, 0.15, 0.15]), # Strategic Investor
                3: np.array([0.20, 0.10, 0.30, 0.40]), # Balanced Budgeter
            }
            distances = {
                cluster_id: np.linalg.norm(features - centroid) 
                for cluster_id, centroid in centroids.items()
            }
            closest_cluster = min(distances, key=distances.get)
            personality_data = PERSONALITIES[closest_cluster]
            
            # Compute live distances and centroids mapping
            for c_id, center in centroids.items():
                p_name_ref = PERSONALITIES[c_id]["name"]
                centroids_dict[p_name_ref] = [float(x) for x in center]
                distances_dict[p_name_ref] = float(distances[c_id])
    
    # Format category radar output for the UI
    radar_data = [
        {"category": cat, "proportion": round(prop * 100, 1)}
        for cat, prop in proportions.items()
    ]
    
    return {
        "personality": personality_data["name"],
        "description": personality_data["description"],
        "traits": personality_data["traits"],
        "category_radar": radar_data,
        "train_inertia": train_inertia,
        "test_inertia": test_inertia,
        "train_users_count": train_users_count,
        "test_users_count": test_users_count,
        "is_locally_trained": is_locally_trained,
        "user_vector": user_vector,
        "centroids": centroids_dict,
        "distances": distances_dict
    }
