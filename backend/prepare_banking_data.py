"""
ACE V2 Banking Data Processor
Prepares banking transaction data for intelligence analysis
"""
import pandas as pd
import json
from pathlib import Path

def prepare_banking_data():
    """Combine banking data files into ACE-compatible format"""
    print("📊 Loading banking data...")
    
    # Load all datasets
    users = pd.read_csv(r"C:\Face Utility\bANK dATA\users_data.csv")
    cards = pd.read_csv(r"C:\Face Utility\bANK dATA\cards_data.csv")
    transactions = pd.read_csv(r"C:\Face Utility\bANK dATA\transactions_data.csv")
    
    print(f"  Users: {len(users)} rows")
    print(f"  Cards: {len(cards)} rows") 
    print(f"  Transactions: {len(transactions)} rows")
    
    # Clean monetary columns in users data
    for col in ['per_capita_income', 'yearly_income', 'total_debt']:
        if col in users.columns:
            users[col] = pd.to_numeric(users[col].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
    
    # Clean monetary columns in cards data
    if 'credit_limit' in cards.columns:
        cards['credit_limit'] = pd.to_numeric(cards['credit_limit'].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
    
    # Clean amount column (remove $ and convert to numeric)
    transactions['amount'] = pd.to_numeric(transactions['amount'].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
    transactions = transactions.dropna(subset=['amount'])
    
    # Aggregate transaction metrics per user
    print("\n📈 Calculating customer metrics...")
    tx_summary = transactions.groupby('client_id').agg({
        'amount': ['sum', 'mean', 'std', 'count']
    }).reset_index()
    
    tx_summary.columns = ['client_id', 'total_spend', 'avg_transaction', 'spend_volatility', 
                          'num_transactions']
    
    # Merge with user data
    customer_data = users.merge(tx_summary, left_on='id', right_on='client_id', how='left')
    
    # Merge with card data (take first card per user)
    cards_first = cards.groupby('client_id').first().reset_index()
    customer_data = customer_data.merge(cards_first, left_on='id', right_on='client_id', how='left')
    
    # Fill missing values
    customer_data = customer_data.fillna(0)
    
    # Rename columns to ACE format
    customer_data = customer_data.rename(columns={
        'id': 'customer_id',
        'total_spend': 'monthly_spend',
        'current_age': 'age',
        'credit_limit': 'credit_limit',
        'credit_score': 'credit_score'
    })
    
    # Calculate derived metrics
    customer_data['utilization'] = (customer_data['monthly_spend'] / 
                                     customer_data['credit_limit'].replace(0, 1))
    customer_data['annual_income'] = customer_data['yearly_income']  # Use actual income
    customer_data['debt_to_income'] = customer_data['total_debt'] / customer_data['annual_income'].replace(0, 1)
    
    # Save
    output_path = Path("data/customer_data.csv")
    customer_data.to_csv(output_path, index=False)
    
    print(f"\n✅ Saved {len(customer_data)} customer records to {output_path}")
    print(f"\nKey metrics:")
    print(f"  Avg spend: ${customer_data['monthly_spend'].mean():.2f}")
    print(f"  Avg credit score: {customer_data['credit_score'].mean():.0f}")
    print(f"  Avg debt/income: {customer_data['debt_to_income'].mean():.2f}")
    
    return customer_data

if __name__ == "__main__":
    prepare_banking_data()
