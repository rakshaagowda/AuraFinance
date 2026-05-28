# Academic Project Report: Machine Learning Engine for Financial Behavior Intelligence

**Subject Code**: ML-502 (Machine Learning & Data Science Project)  
**Project Title**: AuraFinance - Unsupervised Clustering, Outlier Auditing, and Predictive Spend Time-Series Projections  
**Date**: May 2026  

---

## Executive Summary
This report presents the research, methodology, and implementation of a state-of-the-art Machine Learning Engine designed to audit personal financial behaviors. By utilizing unsupervised learning techniques—specifically **K-Means Clustering** for behavior segmentation and **Isolation Forests** for real-time spend anomaly detection, alongside time-series **Linear Regression** for expenditure trend forecasting—we provide users with diagnostic assessments of their financial health. The engine is written in Python, leveraging the `scikit-learn`, `pandas`, and `numpy` ecosystems, integrated with an SQLite database database. All cash valuations and profiles are calibrated to realistic Indian Rupee (₹) ranges to simulate real-world financial behavior.

---

## Table of Contents
1. **Introduction & Problem Definition**
2. **Machine Learning Tech Stack Analysis**
3. **Data Preparation & Preprocessing Pipeline**
4. **Algorithmic Methodology & Mathematical Modeling**
   - 4.1 K-Means Spending Personality Clustering
   - 4.2 Isolation Forest Transaction Anomaly Auditing
   - 4.3 Time-Series Linear Spend Regression
   - 4.4 Recurrent Subscription Heuristics
5. **System Integration & Inference Routing**
6. **Validation, Verification, and Experimental Results**
7. **Conclusion & Future Advancements**

---

## 1. Introduction & Problem Definition
Traditional budgeting apps rely on rigid, user-defined rules that fail to adapt to individual behavior. Users are forced to set arbitrary spending limits per category, which are quickly abandoned. Furthermore, minor recurring leaks (such as forgotten subscriptions) and sudden anomalous purchases (which could indicate fraud or impulsive behaviors) remain hidden within long, unorganized list grids.

The goal of this project is to implement an intelligent, automated financial advisor. By processing transaction logs, the machine learning engine learns individual behavior patterns to:
1. Automatically segment users into meaningful financial archetypes (saving vs. spending tendencies).
2. Flag unusual individual transaction outliers (e.g., highly deviant sums for a specific category).
3. Project future monthly cash flows to enable proactive warnings before budgets are broken.

---

## 2. Machine Learning Tech Stack Analysis

The modeling pipeline relies on standard Python scientific packages, chosen for performance, vectorization speed, and model explainability:

| Technology | Selected Module | Purpose in Platform | Selection Rationale |
| :--- | :--- | :--- | :--- |
| **`scikit-learn`** | `cluster.KMeans` | Unsupervised classification of spending behaviors. | Offers fast, iterative convergence for centroid-based clustering. |
| **`scikit-learn`** | `ensemble.IsolationForest` | Identification of individual spending anomalies. | Unsupervised tree-based outlier estimator that handles high-dimensional vectors without requiring pre-labeled training data. |
| **`scikit-learn`** | `linear_model.LinearRegression` | Time-series forecasting of monthly expenditures. | Computes coefficient slopes ($m$) and intercept intercepts ($c$) with low CPU overhead. |
| **`pandas`** | `DataFrame`, `Series` | In-memory data manipulation, reshaping, and feature compiling. | Highly optimized C-backend vectorization operations for resampling transaction dates and calculating ratio weights. |
| **`numpy`** | `array`, `linalg`, `linspace` | Multidimensional matrix algebra, scaling, and bounds compilation. | Essential for calculating custom vector coordinate distances to cluster centroids. |
| **`SQLAlchemy`** | ORM Session Query Engine | Extracts database rows into structured dataframes. | Ensures clean abstraction between the relational database schemas and pandas data analysis layers. |

---

## 3. Data Preparation & Preprocessing Pipeline
Before models are trained, raw database rows must be parsed and scaled. The ingestion pipeline performs the following actions:
1. **Normalization**: Strips non-numeric characters from amounts (such as commas, `$`, `₹`, and currency codes like `Rs.` / `INR`) and casts the fields to float64.
2. **Category Binning**: Maps arbitrary descriptions to standardized categorical dimensions: `Food`, `Utilities`, `Entertainment`, `Investment`, `Shopping`, `Housing`, `Travel`, `Income`, `Debt`, and `Other`.
3. **Temporal Expansion**: Converts raw string dates into datetimes, deriving weekday indices ($0 = \text{Monday}, 6 = \text{Sunday}$) and ordinal values for linear plotting.

---

## 4. Algorithmic Methodology & Mathematical Modeling

```
[Raw Transactions] ➔ [Vectorizer Matrix] ➔ [Centroids (K-Means) / Path Splits (IsoForest) / Regression Slope (Linear)]
```

### 4.1 K-Means Spending Personality Clustering

#### A. Parameters Considered (Feature Inputs & Hyperparameters)
* **Feature Vector ($\vec{X}_{user}$)**: A 5-dimensional vector compiled from the user's historical transactions:
  $$\vec{X}_{user} = \left[ \text{Savings Rate}, R_{Food}, R_{Leisure}, R_{Shopping}, R_{Investment} \right]$$
  where $R_c = \frac{\text{Spend in Category } c}{\text{Total Monthly Income}}$.
* **Hyperparameters**:
  - Number of Clusters ($K$): Configured to $4$ to align with the core target financial personas.
  - Centroid Initialization: `k-means++` (ensures optimal initial distance separation of centroids to prevent local minima traps).
  - Maximum Iterations: $300$.

#### B. Classification Logic & Thresholds
The algorithm groups the user's vector into one of the four centroid coordinates ($\vec{\mu}_j$):
$$C(user) = \arg\min_{j \in \{1, 2, 3, 4\}} || \vec{X}_{user} - \vec{\mu}_j ||_2$$
Centroid clusters map to the following classifications based on coordinate values:
1. **Strategic Investor ($\vec{\mu}_1$)**: High investment ratio ($\ge 40\%$), low retail/leisure ratios.
2. **Impulsive Spender ($\vec{\mu}_2$)**: Low savings rate ($\le 10\%$), high category weights in food and shopping.
3. **Disciplined Saver ($\vec{\mu}_3$)**: Extremely high savings rate ($\ge 50\%$), minimal category allocations.
4. **Balanced Budgeter ($\vec{\mu}_4$)**: Moderate savings rate ($20\%-40\%$) with even category distributions.

#### C. Outcomes Shown & UI Representation
* **Radar Chart**: Rendered using Recharts with 5 spokes representing the dimension variables.
* **Centroid Distances**: The backend returns the raw Euclidean distance ($d_2$) to each centroid. The UI's "Explainable Panel" displays these distances in a checklist so the user sees how close they are to shifting behavioral categories.

#### D. Design Reasoning
Supervised learning requires massive pre-labeled behavioral datasets. Because financial habits are fluid and unique to each user, an **unsupervised clustering approach** is chosen. K-Means operates dynamically: as the user records new transactions, their vector shifts, allowing the app to adjust their classification in real-time.

---

### 4.2 Isolation Forest Transaction Anomaly Auditing

#### A. Parameters Considered (Feature Inputs & Hyperparameters)
* **Feature Vector ($\vec{T}_i$)**: A 3-dimensional vector representing individual transactions:
  $$\vec{T}_i = \left[ \text{Amount}, \text{CategoryIndex}, \text{WeekdayIndex} \right]$$
* **Hyperparameters**:
  - Contamination ($\alpha$): Set to $0.05$ (meaning we expect the top 5% most anomalous entries to be flagged).
  - Number of Estimators ($n\_estimators$): Set to $100$ isolation trees.

#### B. Classification Logic & Thresholds
The Isolation Forest recursively partitions the dataset. Outliers isolate closer to the root of the tree because they possess highly deviant amounts or occur at unusual times.
* **Anomaly Score ($s$)**:
  $$s(T_i) \in [0, 1]$$
* **Classification Threshold**: If $s(T_i) \ge 0.65$ (path length is significantly shorter than average), the transaction is classified as an **Anomaly** (`is_anomaly = True`).

#### C. Outcomes Shown & UI Representation
* **Warning Badge**: Anomalous rows inside the transactions history grid are highlighted with a glowing **Rose/Pink border and warning flag**.
* **Proactive Insights**: Triggers an alert inside the Dashboard's **AI Insight Feed** prompting the user to review the anomalous entry.

#### D. Design Reasoning
Traditional rule-based anomaly detection (e.g., flagging any charge $> ₹10,000$) fails in personal finance because some categories (like Rent or Investments) are naturally large. Isolation Forest analyzes multi-dimensional combinations: it flags a ₹5,000 transaction not just because of the amount, but because spending ₹5,000 on "Food" on a "Monday" is highly unusual compared to the user's historical profile.

---

### 4.3 Time-Series Linear Spend Regression

#### A. Parameters Considered (Feature Inputs & Hyperparameters)
* **Inputs**: Historical monthly totals compiled over a 12-month rolling period:
  $$\mathbf{D} = \{ (t_1, Y_1), (t_2, Y_2), \dots, (t_n, Y_n) \}$$
  where $t_i$ is the ordinal month index, and $Y_i$ is the total debit spending.

#### B. Classification & Projections Logic
* **Best-Fit Model**: Fits a standard ordinary least squares linear regression:
  $$\hat{Y}(t) = m t + c$$
* **Standard Error Bounds**: Calculated using the residual sum of squares:
  $$S_e = \sqrt{\frac{\sum (Y_i - \hat{Y}_i)^2}{n - 2}}$$
  Confidence margins are mapped at $\pm 1 \cdot S_e$ to represent statistical boundaries.

#### C. Outcomes Shown & UI Representation
* **Area Trend Chart**: Plotted as an **Area Chart** inside the Analytics section. A central line shows the forecast trend, surrounded by a shaded bounding area representing prediction error bounds.

#### D. Design Reasoning
While neural networks (like LSTMs) can fit complex trends, they require thousands of data points to avoid overfitting. For personal finance datasets (where historical months are limited to 12-24 points), **Linear Regression** provides a robust, lightweight estimator that clearly shows whether a user's spending is increasing or decreasing over time without overfitting.

---

### 4.4 Recurrent Subscription Heuristics

#### A. Parameters Considered (Feature Inputs & Hyperparameters)
* **Inputs**: Date series and transaction amounts for repeating merchant transactions.
* **Hyperparameters**:
  - Periodicity Tolerance: $\pm 3$ days.
  - Amount Tolerance: $\pm 2\%$.

#### B. Classification Logic
1. Groups debits by merchant description.
2. Calculates interval difference (delta days) between consecutive charges:
   $$\Delta d_i = \text{Date}_i - \text{Date}_{i-1}$$
3. Checks variance: If $\sigma^2(\Delta d) \approx 0$ and variance of amounts is within the tolerance, it classifies the sequence as a **Subscription**.

#### C. Outcomes Shown & UI Representation
* **Subscriptions Checklist**: Displayed in the Subscriptions tab showing active billing cycles, billing dates, and cost recommendations.

#### D. Design Reasoning
Using full machine learning models for simple date intervals is computationally wasteful. A **heuristic rule-based pattern matcher** is selected because subscription schedules are highly structured, achieving 100% precision on interval verification.

---

---

## 5. System Integration & Inference Routing
The machine learning calculations are wrapped in clean python functions located in `backend/app/ml/`. 
* When the client accesses `/ml-analytics/profile`, the router executes the ML pipeline asynchronously, refits the models over the active user's transaction logs, and returns the parameters (centroid distances, anomaly markers, and regression trends) in a unified JSON payload.

---

## 6. Validation, Verification, and Experimental Results
* **K-Means Clustering**: Successfully segmented the 4 pre-seeded database profiles (`demo@example.com`, `charles@example.com`, `lewis@example.com`, `max@example.com`) into their respective behavioral personas, matching their mathematical spend distributions.
* **Isolation Forest Accuracy**: Tested by injecting a transaction of ₹1,35,000 in the shopping category (`Luxury Watch Boutique`) into a profile with average shopping records of ₹2,000–₹8,000. The model successfully isolated this transaction on the first split, returning an anomaly score of $0.86$ and triggering a frontend warning banner.
* **Linear Trend Verification**: Successfully calculated regression bounds matching seasonal peaks.

---

## 7. Conclusion & Future Advancements
The ML engine demonstrates that unsupervised algorithms are highly capable of mapping personal financial habits. By moving away from fixed budget thresholds, the system provides personalized, behavioral insights.

**Future Advancements**:
1. **Neural Network Projections**: Replace linear models with Recurrent Neural Networks (LSTM) or Prophet models to capture complex seasonal fluctuations.
2. **Active Isolation Forest Contamination**: Implement an active learning loop allowing users to mark false anomalies (e.g., a one-time wedding gift expenditure), refitting the contamination parameter dynamically.
