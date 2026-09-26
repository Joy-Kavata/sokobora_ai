import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

# 1. Generate Synthetic Agritech Dataset
np.random.seed(42)
n_samples = 1500

crops = ['Tomatoes', 'Mangoes', 'Kales', 'Onions', 'Bananas']
storage_types = ['Direct Sun', 'Ambient Shade', 'Ventilated Crates', 'Cold Storage']
counties = ['Kiambu', 'Nakuru', 'Machakos', 'Nyeri', 'Meru']

data = {
    'crop_type': np.random.choice(crops, n_samples),
    'quantity_kg': np.random.randint(50, 2000, n_samples),
    'days_since_harvest': np.random.randint(1, 10, n_samples),
    'storage_type': np.random.choice(storage_types, n_samples),
    'ambient_temp_c': np.random.randint(18, 35, n_samples),
    'county': np.random.choice(counties, n_samples)
}

df = pd.DataFrame(data)

# Base shelf-life rules (in hours) for synthetic targets
shelf_life_base = {'Tomatoes': 120, 'Mangoes': 144, 'Kales': 48, 'Onions': 360, 'Bananas': 168}
storage_multiplier = {'Direct Sun': 0.4, 'Ambient Shade': 0.8, 'Ventilated Crates': 1.0, 'Cold Storage': 2.2}

# Calculate actual hours remaining
df['base_hours'] = df['crop_type'].map(shelf_life_base)
df['mult'] = df['storage_type'].map(storage_multiplier)
df['hours_remaining'] = np.maximum(
    0, 
    (df['base_hours'] * df['mult']) - (df['days_since_harvest'] * 24) - (df['ambient_temp_c'] * 0.8) + np.random.normal(0, 5, n_samples)
)

# Target 1: Spoilage Risk Category
def assign_risk(hrs):
    if hrs <= 24: return 'Critical'
    elif hrs <= 48: return 'High'
    elif hrs <= 96: return 'Medium'
    else: return 'Low'

df['spoilage_risk'] = df['hours_remaining'].apply(assign_risk)

# Target 2: Recommended Market Price (KES / kg)
base_prices = {'Tomatoes': 45, 'Mangoes': 35, 'Kales': 25, 'Onions': 60, 'Bananas': 30}
df['base_price'] = df['crop_type'].map(base_prices)
# Price drops slightly as spoilage risk increases to clear stock faster
df['recommended_price_kes'] = np.round(
    df['base_price'] * np.where(df['spoilage_risk'].isin(['High', 'Critical']), 0.82, 1.0) + np.random.normal(0, 3, n_samples), 1
)

# 2. Features and Pipeline Setup
X = df[['crop_type', 'quantity_kg', 'days_since_harvest', 'storage_type', 'ambient_temp_c', 'county']]
y_risk = df['spoilage_risk']
y_price = df['recommended_price_kes']

categorical_features = ['crop_type', 'storage_type', 'county']
numerical_features = ['quantity_kg', 'days_since_harvest', 'ambient_temp_c']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', 'passthrough', numerical_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ]
)

# 3. Train Models
risk_model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
])

price_model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
])

risk_model.fit(X, y_risk)
price_model.fit(X, y_price)

# 4. Save Trained Models
joblib.dump(risk_model, 'spoilage_risk_model.pkl')
joblib.dump(price_model, 'price_estimation_model.pkl')

print("Models trained and saved successfully as .pkl files!")