"""
Flask API Service for Marine Dashboard
Provides endpoints for vessel data, maritime news, business news, and Baltic Dry Index
"""

import os
import re
import logging
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import feedparser
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Excel file path - relative to this script's location
EXCEL_FILE = os.path.join(os.path.dirname(__file__), 'vessel_data.xlsx')

# ---------------------------------
# 1️⃣ VESSEL DATA FROM EXCEL
# ---------------------------------

@app.route("/api/vessels", methods=["GET"])
def vessels():
    """Fetch vessel data from Excel file"""
    try:
        if not os.path.exists(EXCEL_FILE):
            logger.warning(f"Excel file not found: {EXCEL_FILE}")
            return jsonify({"error": "Vessel data file not found", "vessels": []}), 404
        
        df = pd.read_excel(EXCEL_FILE)
        df = df.fillna("")
        
        vessels_list = []
        
        # Expected column names (adjust if your Excel has different headers)
        column_mapping = {
            "Vessel": "vessel",
            "Position": "position", 
            "Port": "port",
            "ETA": "eta",
            "ETB": "etb",
            "ETD": "etd",
            "NPOC": "npoc"
        }
        
        for _, row in df.iterrows():
            vessel_data = {}
            for excel_col, json_key in column_mapping.items():
                if excel_col in row:
                    vessel_data[json_key] = str(row[excel_col])
                else:
                    vessel_data[json_key] = ""
            vessels_list.append(vessel_data)
        
        logger.info(f"Successfully fetched {len(vessels_list)} vessels")
        return jsonify(vessels_list)
        
    except Exception as e:
        logger.error(f"Error reading vessel data: {str(e)}")
        return jsonify({"error": str(e), "vessels": []}), 500


# ---------------------------------
# 2️⃣ MARITIME NEWS
# ---------------------------------

@app.route("/api/maritime-news", methods=["GET"])
def maritime_news():
    """Fetch maritime news from Maritime Executive RSS feed"""
    try:
        feed = feedparser.parse("https://www.maritime-executive.com/rss")
        
        news = []
        for entry in feed.entries[:5]:
            news.append({
                "title": entry.title,
                "link": entry.link
            })
        
        logger.info(f"Successfully fetched {len(news)} maritime news items")
        return jsonify(news)
        
    except Exception as e:
        logger.error(f"Error fetching maritime news: {str(e)}")
        return jsonify({"error": str(e), "news": []}), 500


# ---------------------------------
# 3️⃣ BUSINESS NEWS
# ---------------------------------

@app.route("/api/business-news", methods=["GET"])
def business_news():
    """Fetch business news from BBC RSS feed"""
    try:
        feed = feedparser.parse("https://feeds.bbci.co.uk/news/business/rss.xml")
        
        news = []
        for entry in feed.entries[:6]:
            image = ""
            
            # Method 1: media_thumbnail
            if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                image = entry.media_thumbnail[0].get("url", "")
            
            # Method 2: media_content
            elif hasattr(entry, 'media_content') and entry.media_content:
                image = entry.media_content[0].get("url", "")
            
            # Method 3: extract image from summary HTML
            elif hasattr(entry, 'summary'):
                match = re.search(r'<img.*?src="([^"]+)"', entry.summary)
                if match:
                    image = match.group(1)
            
            news.append({
                "title": entry.title,
                "link": entry.link,
                "image": image
            })
        
        logger.info(f"Successfully fetched {len(news)} business news items")
        return jsonify(news)
        
    except Exception as e:
        logger.error(f"Error fetching business news: {str(e)}")
        return jsonify({"error": str(e), "news": []}), 500


# ---------------------------------
# 4️⃣ BALTIC DRY INDEX
# ---------------------------------

@app.route("/api/baltic-index", methods=["GET"])
def baltic():
    """Fetch Baltic Dry Index from Trading Economics API"""
    try:
        url = "https://api.tradingeconomics.com/markets/symbol/BDI?c=guest:guest"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        logger.info("Successfully fetched Baltic Dry Index")
        return jsonify(data)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Baltic Index: {str(e)}")
        return jsonify({"value": "Unavailable", "error": str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching Baltic Index: {str(e)}")
        return jsonify({"value": "Unavailable", "error": str(e)}), 500


# ---------------------------------
# Health Check Endpoint
# ---------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "excel_file_exists": os.path.exists(EXCEL_FILE)
    })


# ---------------------------------

if __name__ == "__main__":
    logger.info(f"Excel file path: {EXCEL_FILE}")
    logger.info("Starting Flask API server on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
