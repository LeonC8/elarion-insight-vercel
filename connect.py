import clickhouse_connect
import pandas as pd
import time

# Create client connection
client = clickhouse_connect.get_client(host='34.34.71.156', port=8123, username='default', password='elarion')

# Time the query execution
start_time = time.time()

# Execute query to get distinct market segments
res = client.query("""
    SELECT DISTINCT market_code 
    FROM SAND01CN.insights
    ORDER BY market_code
""")
market_segments = pd.DataFrame(res.result_set, columns=res.column_names)

# Calculate execution time
execution_time = time.time() - start_time

print(f"Query execution time: {execution_time:.2f} seconds")
print("\nAll distinct market segments:")
print(market_segments)

# Optional: If you want to see them as a simple list instead of a DataFrame
print("\nList of market segments:")
for segment in market_segments['market_code']:
    print(f"- {segment}")