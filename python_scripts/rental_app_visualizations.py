import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from matplotlib.patches import Rectangle
import matplotlib.patches as mpatches

# Set style for better looking plots
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# Default file path
DEFAULT_FILE = "results.csv"

def create_individual_charts(file_path=DEFAULT_FILE):
    """Create individual charts and save them as separate PNG files"""
    
    # Load data
    df = pd.read_csv(file_path)
    df_completed = df[df['stat'] == 1].copy()
    
    # Create computed columns if needed
    if 'byear' in df_completed.columns and 'agegr' not in df_completed.columns:
        df_completed['age'] = 2025 - df_completed['byear']
        conditions = [
            (df_completed['age'] >= 15) & (df_completed['age'] <= 24),
            (df_completed['age'] >= 25) & (df_completed['age'] <= 34),
            (df_completed['age'] >= 35) & (df_completed['age'] <= 44),
            (df_completed['age'] >= 45) & (df_completed['age'] <= 54),
            (df_completed['age'] >= 55) & (df_completed['age'] <= 64),
            (df_completed['age'] >= 65)
        ]
        choices = [1, 2, 3, 4, 5, 6]
        df_completed['agegr'] = np.select(conditions, choices, default=0)
    
    print("Creating individual visualizations...")
    
    # 1. Market Overview
    plt.figure(figsize=(10, 8))
    market_data = df_completed['q1'].value_counts()
    colors = ['#FF6B6B', '#4ECDC4', '#95E1D3']
    labels = ['Purchase', 'Rent', 'Not Searching']
    pie_data = [market_data.get(i, 0) for i in [1, 2, 3]]
    plt.pie(pie_data, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors, textprops={'fontsize': 14})
    plt.title('Market Activity Distribution', fontsize=18, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig('01_market_overview.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 2. Search Duration Analysis
    plt.figure(figsize=(10, 8))
    duration_data = df_completed['q8'].value_counts().sort_index()
    duration_labels = ['<1 month', '1-3 months', '3-6 months', '6+ months']
    duration_values = [duration_data.get(i, 0) for i in range(1, 5)]
    bars = plt.bar(duration_labels, duration_values, color=['#2ECC71', '#F39C12', '#E74C3C', '#C0392B'])
    plt.title('Search Duration Distribution', fontsize=18, fontweight='bold', pad=20)
    plt.ylabel('Number of Users', fontsize=14)
    plt.xlabel('Duration', fontsize=14)
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}', ha='center', va='bottom', fontsize=12)
    plt.tight_layout()
    plt.savefig('02_search_duration.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 3. Challenge Level
    plt.figure(figsize=(12, 8))
    challenge_data = df_completed['q6'].value_counts().sort_index()
    challenge_values = [challenge_data.get(i, 0) for i in range(1, 6)]
    total = sum(challenge_values)
    challenge_pct = [v/total*100 for v in challenge_values]
    
    # Create gradient bar
    ax = plt.gca()
    gradient = np.linspace(0, 1, 100).reshape(1, -1)
    ax.imshow(gradient, aspect='auto', cmap='RdYlGn_r', extent=[1, 5, 0, 1])
    
    # Add markers for actual distribution
    for i, (level, pct) in enumerate(zip(range(1, 6), challenge_pct)):
        ax.scatter(level, 0.5, s=pct*100, c='black', alpha=0.6, zorder=5)
        ax.text(level, 0.7, f'{pct:.0f}%', ha='center', fontsize=14, fontweight='bold')
    
    ax.set_xlim(0.5, 5.5)
    ax.set_ylim(0, 1)
    ax.set_xticks(range(1, 6))
    ax.set_xticklabels(['Not\nChallenging', 'Slightly', 'Moderate', 'Very', 'Extremely'], fontsize=12)
    ax.set_yticks([])
    ax.set_title('Search Process Challenge Level', fontsize=18, fontweight='bold', pad=20)
    ax.set_xlabel('Challenge Level', fontsize=14)
    plt.tight_layout()
    plt.savefig('03_challenge_level.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 4. Top Features Importance
    plt.figure(figsize=(12, 8))
    features = {
        'q5_3': 'Parking',
        'q5_2': 'Number of rooms',
        'q5_1': 'Area size',
        'q5_12': 'Extra costs info',
        'q5_10': 'Elevator',
        'q5_6': 'Near education',
        'q5_13': 'Price vs area',
        'q5_7': 'Balcony/Garden'
    }
    
    feature_scores = []
    feature_names = []
    for col, name in features.items():
        if col in df_completed.columns:
            score = df_completed[col].sum() / len(df_completed) * 100
            feature_scores.append(score)
            feature_names.append(name)
    
    # Sort and plot
    sorted_indices = np.argsort(feature_scores)[::-1]
    sorted_scores = [feature_scores[i] for i in sorted_indices]
    sorted_names = [feature_names[i] for i in sorted_indices]
    
    bars = plt.barh(sorted_names, sorted_scores)
    plt.xlabel('% of Users Who Want This Feature', fontsize=14)
    plt.title('Most Important Features (Besides Price)', fontsize=18, fontweight='bold', pad=20)
    plt.xlim(0, 100)
    
    # Color bars based on importance
    for i, (bar, score) in enumerate(zip(bars, sorted_scores)):
        if score > 40:
            bar.set_color('#2ECC71')  # Green for must-have
        elif score > 20:
            bar.set_color('#F39C12')  # Orange for nice-to-have
        else:
            bar.set_color('#95A5A6')  # Gray for optional
        # Add percentage labels
        plt.text(score + 1, bar.get_y() + bar.get_height()/2, 
                f'{score:.1f}%', va='center', fontsize=12)
    
    plt.tight_layout()
    plt.savefig('04_feature_importance.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 5. Pain Points Analysis
    plt.figure(figsize=(12, 8))
    pain_points = {
        'q7_5': 'Time consuming',
        'q7_2': 'Finding suitable places',
        'q7_1': 'Finding databases',
        'q7_3': 'Tracking process',
        'q7_4': 'Organizing details'
    }
    
    pain_scores = []
    pain_names = []
    for col, name in pain_points.items():
        if col in df_completed.columns:
            score = df_completed[col].sum() / len(df_completed) * 100
            pain_scores.append(score)
            pain_names.append(name)
    
    bars = plt.bar(pain_names, pain_scores, color='#E74C3C')
    plt.title('Main Pain Points in Search Process', fontsize=18, fontweight='bold', pad=20)
    plt.ylabel('% of Users Experiencing This', fontsize=14)
    plt.xticks(rotation=45, ha='right')
    
    # Add percentage labels on bars
    for bar, score in zip(bars, pain_scores):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{score:.1f}%', ha='center', fontsize=12)
    
    plt.tight_layout()
    plt.savefig('05_pain_points.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 6. Current Tools Usage
    plt.figure(figsize=(12, 8))
    tools = {
        'q10_1': 'WhatsApp',
        'q10_5': 'Photo galleries',
        'q10_3': 'Notes apps',
        'q10_2': 'Excel',
        'q10_4': 'Pen & paper'
    }
    
    tool_scores = []
    tool_names = []
    for col, name in tools.items():
        if col in df_completed.columns:
            score = df_completed[col].sum() / len(df_completed) * 100
            tool_scores.append(score)
            tool_names.append(name)
    
    bars = plt.barh(tool_names, tool_scores, color='#3498DB')
    plt.xlabel('% of Users Using This Tool', fontsize=14)
    plt.title('Current Search Management Tools', fontsize=18, fontweight='bold', pad=20)
    
    # Add percentage labels
    for bar, score in zip(bars, tool_scores):
        plt.text(score + 1, bar.get_y() + bar.get_height()/2,
                f'{score:.1f}%', va='center', fontsize=12)
    
    plt.tight_layout()
    plt.savefig('06_current_tools.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 7. Willingness to Pay
    plt.figure(figsize=(12, 8))
    payment_data = df_completed['q11'].value_counts().sort_index()
    payment_labels = ['Do it\nalone', 'Use free\ntools', 'Pay small\namount', 'Definitely\npay']
    payment_values = [payment_data.get(i, 0) for i in range(1, 5)]
    
    colors_pay = ['#E74C3C', '#F39C12', '#F1C40F', '#2ECC71']
    bars = plt.bar(payment_labels, payment_values, color=colors_pay)
    plt.title('Willingness to Pay for Solutions', fontsize=18, fontweight='bold', pad=20)
    plt.ylabel('Number of Users', fontsize=14)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}', ha='center', va='bottom', fontsize=12)
    
    plt.tight_layout()
    plt.savefig('07_willingness_to_pay.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 8. Device Usage
    plt.figure(figsize=(10, 8))
    device_data = df_completed['q3'].value_counts()
    device_labels = ['Smartphone', 'Tablet', 'Computer']
    device_values = [device_data.get(i, 0) for i in [1, 2, 3]]
    
    plt.pie(device_values, labels=device_labels, autopct='%1.1f%%', startangle=45,
            colors=['#3498DB', '#9B59B6', '#1ABC9C'], textprops={'fontsize': 14})
    plt.title('Device Usage for Apartment Search', fontsize=18, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig('08_device_usage.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 9. Decision-Making Styles
    plt.figure(figsize=(12, 8))
    style_data = df_completed['q14'].value_counts()
    style_labels = ['Organized', 'Spontaneous', 'Social', 'Researcher', 'Cautious']
    style_values = [style_data.get(i, 0) for i in range(1, 6)]
    
    bars = plt.bar(style_labels, style_values, color='#8E44AD')
    plt.title('User Decision-Making Styles', fontsize=18, fontweight='bold', pad=20)
    plt.ylabel('Number of Users', fontsize=14)
    plt.xticks(rotation=45)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}', ha='center', va='bottom', fontsize=12)
    
    plt.tight_layout()
    plt.savefig('09_decision_styles.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 10. Geographic Distribution
    plt.figure(figsize=(10, 8))
    if 'nafa' in df_completed.columns:
        location_data = df_completed['nafa'].value_counts().head(5)
        location_mapping = {
            1: 'Jerusalem', 2: 'North', 3: 'Haifa', 4: 'Center',
            5: 'Tel Aviv', 6: 'South', 7: 'Judea & Samaria'
        }
        
        location_names = [location_mapping.get(idx, f'Region {idx}') for idx in location_data.index]
        plt.pie(location_data.values, labels=location_names, autopct='%1.1f%%', 
                textprops={'fontsize': 14})
        plt.title('Top 5 Geographic Markets', fontsize=18, fontweight='bold', pad=20)
    else:
        plt.text(0.5, 0.5, 'Geographic data not available', ha='center', va='center', fontsize=16)
        plt.axis('off')
    
    plt.tight_layout()
    plt.savefig('10_geographic_distribution.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 11. Age Distribution
    plt.figure(figsize=(10, 8))
    if 'agegr' in df_completed.columns:
        age_data = df_completed[df_completed['agegr'] > 0]['agegr'].value_counts().sort_index()
        age_labels = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+']
        age_values = [age_data.get(i, 0) for i in range(1, 7)]
        
        bars = plt.bar(age_labels, age_values, color='#16A085')
        plt.title('Age Group Distribution', fontsize=18, fontweight='bold', pad=20)
        plt.ylabel('Number of Users', fontsize=14)
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height,
                    f'{int(height)}', ha='center', va='bottom', fontsize=12)
    else:
        plt.text(0.5, 0.5, 'Age data not available', ha='center', va='center', fontsize=16)
        plt.axis('off')
    
    plt.tight_layout()
    plt.savefig('11_age_distribution.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # 12. Key Metrics Summary
    plt.figure(figsize=(10, 8))
    plt.axis('off')
    
    # Calculate key metrics
    active_searchers = df_completed[df_completed['q1'].isin([1, 2])].shape[0]
    willing_to_pay = df_completed[df_completed['q11'].isin([3, 4])].shape[0]
    long_searchers = df_completed[df_completed['q8'].isin([3, 4])].shape[0]
    high_challenge = df_completed[df_completed['q6'] >= 4].shape[0]
    
    metrics_text = f"""KEY MARKET METRICS

Active Searchers: {active_searchers/len(df_completed)*100:.1f}%
Willing to Pay: {willing_to_pay/len(df_completed)*100:.1f}%
Long Searchers (3+ months): {long_searchers/len(df_completed)*100:.1f}%
Finding it Very Challenging: {high_challenge/len(df_completed)*100:.1f}%

Total Sample Size: {len(df_completed)} users"""
    
    plt.text(0.5, 0.5, metrics_text, fontsize=20, verticalalignment='center',
             horizontalalignment='center',
             bbox=dict(boxstyle="round,pad=1", facecolor="lightgray", alpha=0.8))
    
    plt.title('Summary Statistics', fontsize=24, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig('12_key_metrics.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print("\n✓ Individual charts saved successfully!")
    print("Files created:")
    print("  • 01_market_overview.png")
    print("  • 02_search_duration.png")
    print("  • 03_challenge_level.png")
    print("  • 04_feature_importance.png")
    print("  • 05_pain_points.png")
    print("  • 06_current_tools.png")
    print("  • 07_willingness_to_pay.png")
    print("  • 08_device_usage.png")
    print("  • 09_decision_styles.png")
    print("  • 10_geographic_distribution.png")
    print("  • 11_age_distribution.png")
    print("  • 12_key_metrics.png")
    
    return df_completed

def create_rental_market_dashboard(file_path=DEFAULT_FILE):
    """Create both individual charts and the full dashboard"""
    
    # First create individual charts
    df_completed = create_individual_charts(file_path)
    
    # Then create the full dashboard (your existing code)
    # ... (keep the existing dashboard code here)
    
    return df_completed

def run_visual_analysis(file_path=DEFAULT_FILE):
    """Run visual analysis and save both individual charts and dashboard"""
    print("\n" + "="*80)
    print("GENERATING VISUAL DASHBOARD AND INDIVIDUAL CHARTS")
    print("="*80)
    print("Creating comprehensive market analysis visualizations...")
    
    df = create_rental_market_dashboard(file_path)
    
    print("\n✓ All visualizations completed!")
    print(f"✓ Analysis based on {len(df)} completed responses")
    
    return df

# Main execution
if __name__ == "__main__":
    run_visual_analysis()