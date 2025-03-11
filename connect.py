import clickhouse_connect
import pandas as pd
import time

# Create client connection
client = clickhouse_connect.get_client(host='34.34.71.156', port=8123, username='default', password='elarion')

# Time the query execution
start_time = time.time()

# Execute query with date filter
res = client.query("""
    SELECT * 
    FROM SAND01CN.room_types_insights
""")
df = pd.DataFrame(res.result_set, columns=res.column_names)

# Calculate execution time
execution_time = time.time() - start_time

print(f"Query execution time: {execution_time:.2f} seconds")
print("\nDataframe info:")
print(df.info())