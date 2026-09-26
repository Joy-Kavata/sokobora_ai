import pandas as pd
import joblib

# Load saved models
risk_model = joblib.load('spoilage_risk_model.pkl')
price_model = joblib.load('price_estimation_model.pkl')

def predict_produce_status(crop_type, quantity_kg, days_since_harvest, storage_type, ambient_temp_c, county):
    # Prepare input dataframe
    input_data = pd.DataFrame([{
        'crop_type': crop_type,
        'quantity_kg': quantity_kg,
        'days_since_harvest': days_since_harvest,
        'storage_type': storage_type,
        'ambient_temp_c': ambient_temp_c,
        'county': county
    }])
    
    # Run predictions
    risk_level = risk_model.predict(input_data)[0]
    estimated_price = price_model.predict(input_data)[0]
    
    # Generate price range (+/- 5%)
    min_price = round(estimated_price * 0.95, 1)
    max_price = round(estimated_price * 1.05, 1)
    
    # Determine flash auction flag
    trigger_flash_auction = risk_level in ['High', 'Critical']
    
    return {
        "crop": crop_type,
        "quantity_kg": quantity_kg,
        "spoilage_risk": risk_level,
        "estimated_price_range_kes": f"KES {min_price} - {max_price} / kg",
        "trigger_flash_auction": trigger_flash_auction
    }

# Simulation: A farmer in Kiambu logging 800kg of Tomatoes harvested 3 days ago in direct sun
sample_prediction = predict_produce_status(
    crop_type='Tomatoes',
    quantity_kg=800,
    days_since_harvest=3,
    storage_type='Direct Sun',
    ambient_temp_c=28,
    county='Kiambu'
)

print("\n--- AI Engine Test Prediction Output ---")
for key, value in sample_prediction.items():
    print(f"{key}: {value}")