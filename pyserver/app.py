import os
import re

import feedparser
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import requests

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Also handle OPTIONS requests for CORS preflight
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = app.make_default_options_response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        resp.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return resp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = os.path.join(BASE_DIR, "vessel_data.xlsx")

# ---------------------------------
# 1️⃣ VESSEL DATA FROM EXCEL
# ---------------------------------

@app.route("/api/vessels")
def vessels():

    df = pd.read_excel(EXCEL_FILE)
    df = df.fillna("")

    vessels = []

    for _, row in df.iterrows():
        vessels.append({
            "vessel": str(row["Vessel"]),
            "position": str(row["Position"]),
            "port": str(row["Port"]),
            "eta": str(row["ETA"]),
            "etb": str(row["ETB"]),
            "etd": str(row["ETD"]),
            "npoc": str(row["NPOC"])
        })

    print("Data returned by /api/vessels:", vessels)
    return jsonify(vessels)


@app.route("/api/vessels/marquee")
def vessels_marquee():
    df = pd.read_excel(EXCEL_FILE)
    df = df.fillna("")

    vessels = []

    for _, row in df.iterrows():
        vessels.append({
            "vessel": str(row["Vessel"]),
            "position": str(row["Position"]),
            "port": str(row["Port"]),
            "eta": str(row["ETA"]),
            "etb": str(row["ETB"]),
            "etd": str(row["ETD"]),
            "npoc": str(row["NPOC"])
        })

    print("Data returned by /api/vessels/marquee:", vessels)
    return jsonify(vessels)


# ---------------------------------
# 2️⃣ MARITIME NEWS
# ---------------------------------

@app.route("/api/maritime-news")
def maritime_news():

    feed = feedparser.parse("https://www.maritime-executive.com/rss")

    news = []

    for entry in feed.entries[:5]:
        news.append({
            "title": entry.title,
            "link": entry.link
        })

    return jsonify(news)


# ---------------------------------
# 3️⃣ BUSINESS NEWS
# ---------------------------------

@app.route("/api/business-news")
def business_news():

    feed = feedparser.parse("https://feeds.bbci.co.uk/news/business/rss.xml")

    news = []

    for entry in feed.entries[:6]:

        image = ""

        # Method 1: media_thumbnail
        if "media_thumbnail" in entry:
            image = entry.media_thumbnail[0]["url"]

        # Method 2: extract image from summary HTML
        elif "summary" in entry:
            match = re.search(r'<img.*?src="(.*?)"', entry.summary)
            if match:
                image = match.group(1)

        news.append({
            "title": entry.title,
            "link": entry.link,
            "image": image
        })

    return jsonify(news)

# ---------------------------------
# 4️⃣ BALTIC DRY INDEX
# ---------------------------------

@app.route("/api/baltic-index")
def baltic():

    try:
        url = "https://api.tradingeconomics.com/markets/symbol/BDI?c=guest:guest"

        r = requests.get(url)
        data = r.json()

        return jsonify(data)

    except:
        return jsonify({"value": "Unavailable"})


# ---------------------------------

if __name__ == "__main__":
    app.run(debug=True)