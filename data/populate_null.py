import pandas as pd
from datetime import datetime

def populate_null_dates():
    # Read the original CSV file
    input_file = 'data/hotel_data.csv'
    output_file = 'data/hotel_data_populated.csv'
    
    # Read the CSV file
    df = pd.read_csv(input_file)
    
    # Get current datetime in the same format as the data
    current_datetime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Fill null values in the last column (scd_valid_to) with current datetime
    df['scd_valid_to'] = df['scd_valid_to'].fillna(current_datetime)
    
    # Save to a new CSV file
    df.to_csv(output_file, index=False)
    print(f"Created populated file at: {output_file}")

if __name__ == "__main__":
    populate_null_dates()
