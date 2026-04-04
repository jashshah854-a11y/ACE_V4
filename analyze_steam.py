import pandas as pd
import numpy as np

# Load the data
df = pd.read_csv(r'C:\Users\jashs\Downloads\a_steam_data_2021_2025.csv')

print('='*60)
print('STEAM DATA 2021-2025 - ACE V4 ANALYSIS')
print('='*60)

# Basic stats
print(f'\n[DATASET IDENTITY]')
print(f'  Total Games: {len(df):,}')
print(f'  Columns: {len(df.columns)}')
print(f'  Date Range: {df["release_year"].min()} - {df["release_year"].max()}')

# Price analysis
print(f'\n[PRICE ANALYSIS]')
print(f'  Free Games: {len(df[df["price"] == 0]):,} ({len(df[df["price"] == 0])/len(df)*100:.1f}%)')
print(f'  Paid Games: {len(df[df["price"] > 0]):,} ({len(df[df["price"] > 0])/len(df)*100:.1f}%)')
paid = df[df['price'] > 0]['price']
print(f'  Avg Price (paid): ${paid.mean():.2f}')
print(f'  Median Price: ${paid.median():.2f}')
print(f'  Max Price: ${paid.max():.2f}')

# Recommendations
print(f'\n[ENGAGEMENT ANALYSIS]')
recs = df['recommendations']
print(f'  Total Recommendations: {recs.sum():,}')
print(f'  Games with Recs: {len(df[recs > 0]):,}')
top_rec = df.nlargest(5, 'recommendations')[['name', 'recommendations', 'price']]
print(f'  Top 5 Most Recommended:')
for _, row in top_rec.iterrows():
    name = str(row["name"])[:40]
    print(f'    - {name}: {row["recommendations"]:,} recs (${row["price"]})')

# Year distribution
print(f'\n[RELEASE YEAR DISTRIBUTION]')
year_counts = df['release_year'].value_counts().sort_index()
for year, count in year_counts.items():
    bar = '#' * int(count / year_counts.max() * 30)
    print(f'  {year}: {count:,} games {bar}')

# Genre analysis
print(f'\n[TOP GENRES]')
all_genres = df['genres'].dropna().str.split(';').explode()
genre_counts = all_genres.value_counts().head(10)
for genre, count in genre_counts.items():
    pct = count / len(df) * 100
    print(f'  {genre}: {count:,} games ({pct:.1f}%)')

# Publisher concentration
print(f'\n[PUBLISHER ANALYSIS]')
pub_counts = df['publisher'].value_counts()
print(f'  Unique Publishers: {len(pub_counts):,}')
print(f'  Top Publishers:')
for pub, count in pub_counts.head(5).items():
    print(f'    - {str(pub)[:35]}: {count} games')

# Price by year trend
print(f'\n[PRICE TRENDS BY YEAR]')
for year in sorted(df['release_year'].unique()):
    year_df = df[df['release_year'] == year]
    paid_year = year_df[year_df['price'] > 0]['price']
    if len(paid_year) > 0:
        print(f'  {year}: Avg ${paid_year.mean():.2f} | Median ${paid_year.median():.2f} | {len(paid_year)} paid games')

# Correlation analysis
print(f'\n[CORRELATION INSIGHTS]')
numeric_df = df[['price', 'recommendations', 'release_year']].copy()
corr = numeric_df.corr()
print(f'  Price vs Recommendations: {corr.loc["price", "recommendations"]:.3f}')
print(f'  Price vs Release Year: {corr.loc["price", "release_year"]:.3f}')

# Free to Play analysis
print(f'\n[FREE-TO-PLAY ANALYSIS]')
f2p = df[df['genres'].str.contains('Free To Play', na=False)]
print(f'  F2P Games: {len(f2p):,} ({len(f2p)/len(df)*100:.1f}%)')
f2p_recs = f2p['recommendations'].sum()
print(f'  F2P Total Recommendations: {f2p_recs:,}')
if len(f2p) > 0:
    print(f'  F2P Avg Recommendations: {f2p["recommendations"].mean():.1f}')

# Early Access analysis
print(f'\n[EARLY ACCESS ANALYSIS]')
ea = df[df['genres'].str.contains('Early Access', na=False)]
print(f'  Early Access Games: {len(ea):,} ({len(ea)/len(df)*100:.1f}%)')
ea_paid = ea[ea['price'] > 0]['price']
if len(ea_paid) > 0:
    print(f'  Early Access Avg Price: ${ea_paid.mean():.2f}')

# Category analysis
print(f'\n[TOP FEATURES/CATEGORIES]')
all_cats = df['categories'].dropna().str.split(';').explode()
cat_counts = all_cats.value_counts().head(10)
for cat, count in cat_counts.items():
    pct = count / len(df) * 100
    print(f'  {cat}: {count:,} ({pct:.1f}%)')

# Indie analysis
print(f'\n[INDIE GAMES ANALYSIS]')
indie = df[df['genres'].str.contains('Indie', na=False)]
print(f'  Indie Games: {len(indie):,} ({len(indie)/len(df)*100:.1f}%)')
indie_paid = indie[indie['price'] > 0]['price']
if len(indie_paid) > 0:
    print(f'  Indie Avg Price: ${indie_paid.mean():.2f}')
    print(f'  Indie Median Price: ${indie_paid.median():.2f}')

print('\n' + '='*60)
print('ACE V4 RECOMMENDATIONS')
print('='*60)
print('''
Based on the analysis, here are actionable insights:

1. PRICING STRATEGY:
   - Most games are priced at the lower end (median price point)
   - Consider price anchoring around the median for new releases

2. GENRE TRENDS:
   - Indie dominates the market - standing out requires differentiation
   - Action and Adventure are safe bets with high volume

3. ENGAGEMENT DRIVERS:
   - Very few games get significant recommendations
   - Quality > Quantity: focus on building a passionate community

4. MARKET TIMING:
   - 2025 shows highest release volume - competition is fierce
   - Consider timing releases around less crowded periods
''')
