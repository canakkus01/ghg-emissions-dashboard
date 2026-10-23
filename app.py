from flask import Flask, render_template, request, jsonify
import csv

app = Flask(__name__)

# This is the category key for total GHG emissions in the CSV
GHG_KEY = 'greenhouse_gas_ghgs_emissions_without_land_use_land_use_change_and_forestry_lulucf_in_kilotonne_co2_equivalent'


# Read the CSV and return only the total GHG rows
def read_data():
    rows = []
    with open('static/data/ghg_data.csv', newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row['category'] != GHG_KEY:
                continue
            try:
                rows.append({
                    'country': row['country_or_area'],
                    'year':    int(row['year']),
                    'value':   round(float(row['value']), 2)
                })
            except ValueError:
                pass
    return rows


# Home page
@app.route('/')
def home():
    return render_template('index.html')


# Visualization page — passes the country list to the template
@app.route('/visualization')
def visualization():
    countries = sorted(set(r['country'] for r in read_data()))
    return render_template('visualization.html', countries=countries)


# Contact page — handles both GET (show form) and POST (submit form)
@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name    = request.form.get('name', '').strip()
        email   = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()

        if not name or not email or not message:
            return render_template('contact.html', error='All fields are required.')

        return render_template('contact.html', success=True, name=name)

    return render_template('contact.html')


# API endpoint — the chart fetches data from here using filters
@app.route('/api/data')
def api_data():
    countries  = request.args.getlist('countries')
    year_start = request.args.get('year_start', type=int)
    year_end   = request.args.get('year_end', type=int)

    result = []
    for row in read_data():
        if countries  and row['country'] not in countries: continue
        if year_start and row['year'] < year_start:        continue
        if year_end   and row['year'] > year_end:          continue
        result.append(row)

    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)
