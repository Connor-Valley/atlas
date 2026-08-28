"""
Builds src/data/climate-stations.json and src/data/climate-station-normals.json — the
nearest-station fallback data used by climate.service.ts when a live Open-Meteo fetch fails.

Data source: Meteostat bulk daily data + station metadata (CC BY-NC 4.0, non-commercial with
attribution — see https://dev.meteostat.net/terms.html before using this for a monetized build).

Requires: pip install pyarrow pandas

Usage:
  1. Download the station metadata file:
       curl -o stations-lite.json.gz https://bulk.meteostat.net/v2/stations/lite.json.gz
  2. Download one daily bulk file per year matching START_YEAR..END_YEAR below:
       curl -o daily-2014.parquet https://data.meteostat.net/daily/2014.parquet
       ... (2015 through 2023)
  3. Put all of the above in the same directory as this script (or edit BASE below).
  4. Run: python3 build-climate-normals.py

This only needs to be re-run if START_YEAR/END_YEAR in climate.service.ts change (i.e. once a
year, when the historical window rolls forward), or to pick up a newer Meteostat station dump.
"""

import gzip
import json
import os

import pandas as pd
import pyarrow.parquet as pq

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "../src/data")

START_YEAR = 2014
END_YEAR = 2023
HOT_C = 35.0       # matches HOT_DAY_CELSIUS in climate.service.ts
FREEZE_C = 0.0     # matches FREEZING_DAY_CELSIUS in climate.service.ts
SUNNY_MIN = 360    # 6 hours, matches SUNSHINE_THRESHOLD_SECONDS in climate.service.ts
MIN_TEMP_DAYS = 1000  # ~3 years' worth; drops unreliably sparse stations


def main():
    with gzip.open(f"{BASE}/stations-lite.json.gz") as f:
        stations = json.load(f)

    us_stations = {}
    for s in stations:
        if s.get("country") != "US":
            continue
        loc = s.get("location") or {}
        lat, lon = loc.get("latitude"), loc.get("longitude")
        if lat is None or lon is None:
            continue
        d = (s.get("inventory") or {}).get("daily") or {}
        start, end = d.get("start"), d.get("end")
        if not start or not end or start[:4] > str(END_YEAR) or end[:4] < str(START_YEAR):
            continue
        us_stations[s["id"]] = {"lat": lat, "lon": lon}

    print(f"Candidate US stations with daily coverage overlapping {START_YEAR}-{END_YEAR}: {len(us_stations)}")
    station_ids = set(us_stations.keys())

    frames = []
    for year in range(START_YEAR, END_YEAR + 1):
        path = f"{BASE}/daily-{year}.parquet"
        print(f"Reading {path}...")
        table = pq.read_table(path, columns=["station", "date", "temp", "tmin", "tmax", "prcp", "snwd", "tsun"])
        df = table.to_pandas()
        df = df[df["station"].isin(station_ids)]
        frames.append(df)
        print(f"  {year}: {len(df)} rows kept")

    all_df = pd.concat(frames, ignore_index=True)
    print(f"Total combined rows: {len(all_df)}")

    all_df["year"] = pd.to_datetime(all_df["date"]).dt.year
    all_df["month"] = pd.to_datetime(all_df["date"]).dt.month

    def c_to_f(c):
        return round(c * 9 / 5 + 32, 1)

    normals = {}
    kept_station_ids = []

    for station_id, g in all_df.groupby("station"):
        valid_temp = g["temp"].dropna()
        if len(valid_temp) < MIN_TEMP_DAYS:
            continue

        years_covered = g["year"].nunique()
        if years_covered < 1:
            continue

        summer = g[g["month"].isin([6, 7, 8])]["tmax"].dropna()
        winter = g[g["month"].isin([12, 1, 2])]["tmin"].dropna()

        valid_max = g["tmax"].dropna()
        valid_min = g["tmin"].dropna()
        valid_tsun = g["tsun"].dropna()
        valid_snwd = g["snwd"].dropna()
        valid_prcp = g["prcp"].dropna()

        normals[station_id] = {
            "avgTempF": c_to_f(valid_temp.mean()),
            "summerAvgHighF": c_to_f(summer.mean()) if len(summer) else None,
            "winterAvgLowF": c_to_f(winter.mean()) if len(winter) else None,
            "sunnyDaysPerYear": round((valid_tsun >= SUNNY_MIN).sum() / years_covered) if len(valid_tsun) >= 100 else None,
            "annualPrecipitationInches": round(valid_prcp.sum() / years_covered / 25.4, 1) if len(valid_prcp) >= 100 else None,
            "hotDaysPerYear": round((valid_max >= HOT_C).sum() / years_covered) if len(valid_max) else None,
            "freezingDaysPerYear": round((valid_min <= FREEZE_C).sum() / years_covered) if len(valid_min) else None,
            "snowDaysPerYear": round((valid_snwd > 0).sum() / years_covered) if len(valid_snwd) >= 100 else None,
            "yearsCovered": int(years_covered),
        }
        kept_station_ids.append(station_id)

    print(f"Stations with usable normals: {len(normals)}")

    stations_out = [
        {"id": sid, "lat": us_stations[sid]["lat"], "lon": us_stations[sid]["lon"]}
        for sid in kept_station_ids
    ]

    with open(f"{OUT_DIR}/climate-stations.json", "w") as f:
        json.dump(stations_out, f)
    with open(f"{OUT_DIR}/climate-station-normals.json", "w") as f:
        json.dump(normals, f)

    print(f"Wrote {OUT_DIR}/climate-stations.json and {OUT_DIR}/climate-station-normals.json")


if __name__ == "__main__":
    main()
