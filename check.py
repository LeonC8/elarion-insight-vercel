#!/usr/bin/env python3
"""
Quick check of JADRANKA.insights table
"""

import os
import requests
from datetime import datetime

def query_clickhouse(query):
    """Execute a query against ClickHouse and return the response"""
    host = os.getenv('CLICKHOUSE_HOST', 'http://34.34.71.156:8123')
    username = os.getenv('CLICKHOUSE_USER', 'default')
    password = os.getenv('CLICKHOUSE_PASSWORD', 'elarion')
    
    url = f"{host}/"
    params = {
        'user': username,
        'password': password,
        'query': query
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        if response.status_code == 200:
            return response.text.strip()
        else:
            return f"ERROR {response.status_code}: {response.text}"
    except Exception as e:
        return f"ERROR: {str(e)}"

def main():
    print("🔍 Checking JADRANKA.insights table...")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Get row count
    print("📊 Row count:")
    count = query_clickhouse("SELECT count() FROM JADRANKA.insights")
    print(f"   Total rows: {count}")
    
    if count != "0" and not count.startswith("ERROR"):
        print("\n📅 Date range:")
        min_date = query_clickhouse("SELECT min(booking_date) FROM JADRANKA.insights")
        max_date = query_clickhouse("SELECT max(booking_date) FROM JADRANKA.insights")
        print(f"   Booking dates: {min_date} to {max_date}")
        
        min_occ = query_clickhouse("SELECT min(occupancy_date) FROM JADRANKA.insights")
        max_occ = query_clickhouse("SELECT max(occupancy_date) FROM JADRANKA.insights")
        print(f"   Occupancy dates: {min_occ} to {max_occ}")
        
        print("\n💰 Sample revenue data:")
        sample = query_clickhouse("SELECT property, booking_date, occupancy_date, sold_rooms, totalRevenue FROM JADRANKA.insights LIMIT 5 FORMAT TabSeparated")
        if sample and not sample.startswith("ERROR"):
            lines = sample.split('\n')
            print("   Property | Booking Date | Occupancy Date | Rooms | Revenue")
            print("   " + "-" * 60)
            for line in lines:
                if line.strip():
                    parts = line.split('\t')
                    if len(parts) >= 5:
                        print(f"   {parts[0]:<8} | {parts[1]:<12} | {parts[2]:<14} | {parts[3]:<5} | {parts[4]}")
    else:
        print("   ❌ Table is still empty")
    
    # Also check other databases
    print("\n🗄️ Quick check of other databases:")
    sand_count = query_clickhouse("SELECT count() FROM SAND01CN.insights")
    print(f"   SAND01CN.insights rows: {sand_count}")
    
    default_tables = query_clickhouse("SHOW TABLES FROM default")
    print(f"   Tables in 'default' database: {default_tables.replace(chr(10), ', ') if default_tables else 'None'}")

if __name__ == "__main__":
    main()