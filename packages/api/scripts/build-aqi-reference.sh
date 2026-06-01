#!/usr/bin/env bash
# Downloads EPA annual AQI by county CSV and generates the static reference JSON.
# Run once a year after EPA publishes updated data (usually Q2 of following year).
# Usage: bash scripts/build-aqi-reference.sh [YEAR]   (default: 2023)

YEAR=${1:-2023}
ZIP_URL="https://aqs.epa.gov/aqsweb/airdata/annual_aqi_by_county_${YEAR}.zip"
OUT="src/data/aqi_by_county_${YEAR}.json"

echo "Downloading $ZIP_URL..."
curl -sL "$ZIP_URL" | python3 - <<'EOF'
import sys, csv, json, zipfile, io

data = sys.stdin.buffer.read()
with zipfile.ZipFile(io.BytesIO(data)) as z:
    name = z.namelist()[0]
    content = z.read(name).decode("utf-8")

reader = csv.DictReader(content.splitlines())
out = {}
for row in reader:
    key = f"{row['State'].strip().lower()}|{row['County'].strip().lower()}"
    out[key] = {
        "year": int(row["Year"]),
        "daysWithAqi": int(row["Days with AQI"]),
        "goodDays": int(row["Good Days"]),
        "moderateDays": int(row["Moderate Days"]),
        "unhealthyForSensitiveGroupsDays": int(row["Unhealthy for Sensitive Groups Days"]),
        "unhealthyDays": int(row["Unhealthy Days"]),
        "veryUnhealthyDays": int(row["Very Unhealthy Days"]),
        "hazardousDays": int(row["Hazardous Days"]),
        "maxAqi": int(row["Max AQI"]),
        "p90Aqi": int(row["90th Percentile AQI"]),
        "medianAqi": int(row["Median AQI"]),
    }
sys.stderr.write(f"Processed {len(out)} counties\n")
print(json.dumps(out))
EOF
