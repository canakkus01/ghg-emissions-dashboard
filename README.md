# Greenhouse Gas Emissions Dashboard

An interactive web dashboard for exploring country-level greenhouse gas emissions over time. Pick countries and a year range, and the charts update from a small Flask API.

Built for the Data Visualisation course in the Applied Data Science & AI program at Zuyd University of Applied Sciences.

## Features

- Bar and line charts drawn with D3.js, with tooltips
- Filter by any combination of countries and a start and end year
- Flask backend with a JSON endpoint (`/api/data`) that does the filtering
- Total GHG emissions (excluding land use, in kilotonnes CO2 equivalent) for 8,400+ country-year records

## Tech stack

Python, Flask, D3.js, JavaScript, HTML, CSS

## How to run

```bash
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

## Data

`static/data/ghg_data.csv` holds the total GHG emissions series from the UN greenhouse gas inventory data, trimmed to the category the dashboard uses.
