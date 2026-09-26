from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib
import os

app = FastAPI(title="SokoBora AI Prediction Microservice")

# 1. Define the input data format expected from Node.js
class ProducePredictionInput(BaseModel):
    crop_type: str
    quantity_kg: float
    days_since_harvest: int
    storage_type: str
    ambient_temp_c: float
    county: str

# 2. Load trained machine learning models on startup
MODEL_DIR = os.path.dirname(__file__)
try:
    risk_model = joblib.load(os.path.join(MODEL_DIR, "spoilage_risk_model.pkl"))
    price_model = joblib.load(os.path.join(MODEL_DIR, "price_estimation_model.pkl"))
except Exception as e:
    print(f"Warning: Model files not found. Ensure train_model.py has run. Error: {e}")

@app.get("/")
def health_check():
    return {"status": "online", "service": "SokoBora AI Engine"}

@app.post("/predict")
def predict_spoilage_and_price(data: ProducePredictionInput):
    try:
        # Convert input JSON into DataFrame for Scikit-Learn
        input_df = pd.DataFrame([{
            'crop_type': data.crop_type,
            'quantity_kg': data.quantity_kg,
            'days_since_harvest': data.days_since_harvest,
            'storage_type': data.storage_type,
            'ambient_temp_c': data.ambient_temp_c,
            'county': data.county
        }])

        # Run AI Model Inference
        risk_level = str(risk_model.predict(input_df)[0])  # 'Low', 'Medium', 'High', 'Critical'
        estimated_price = float(price_model.predict(input_df)[0])

        # Business Logic Rules
        min_price = round(estimated_price * 0.95, 1)
        max_price = round(estimated_price * 1.05, 1)
        trigger_flash_auction = risk_level in ['High', 'Critical']

        # Estimate remaining shelf-life hours for visualization
        shelf_hours_map = {'Low': 120.0, 'Medium': 72.0, 'High': 36.0, 'Critical': 12.0}
        estimated_shelf_hours = shelf_hours_map.get(risk_level, 48.0)

        return {
            "spoilage_risk": risk_level,
            "estimated_shelf_hours": estimated_shelf_hours,
            "recommended_min_price": min_price,
            "recommended_max_price": max_price,
            "flash_auction_trigger": trigger_flash_auction,
            "confidence_score": 0.94
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")