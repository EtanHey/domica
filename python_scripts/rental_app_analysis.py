import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import warnings
import os
from datetime import datetime
warnings.filterwarnings('ignore')

# Default file path
DEFAULT_FILE = "results.csv"

# Create output directory
OUTPUT_DIR = f"rental_analysis_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def ensure_output_dir():
    """Create output directory if it doesn't exist"""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    return OUTPUT_DIR

# Load the data
def load_and_prepare_data(file_path=DEFAULT_FILE):
    """Load CSV data and prepare for analysis"""
    df = pd.read_csv(file_path)
    
    # Filter only completed surveys (stat == 1)
    df_completed = df[df['stat'] == 1].copy()
    
    output = []
    output.append(f"Total responses: {len(df)}")
    output.append(f"Completed responses: {len(df_completed)}")
    
    return df_completed, output

def analyze_search_behavior(df):
    """Analyze apartment search behavior patterns"""
    output = []
    output.append("\n=== APARTMENT SEARCH BEHAVIOR ===")
    
    # Q1: Did they search for an apartment in last 3 years?
    search_stats = df['q1'].value_counts()
    search_mapping = {1: 'Purchase', 2: 'Rent', 3: 'Did not search'}
    
    output.append("\nSearch Type Distribution:")
    for val, count in search_stats.items():
        if pd.notna(val):
            output.append(f"  {search_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q2: Did they use a realtor?
    realtor_stats = df['q2'].value_counts()
    realtor_mapping = {
        1: 'Purchase with realtor',
        2: 'Rent with realtor', 
        3: 'Purchase without realtor',
        4: 'Rent without realtor'
    }
    
    output.append("\nRealtor Usage:")
    for val, count in realtor_stats.items():
        if pd.notna(val):
            output.append(f"  {realtor_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q3: Device usage
    device_stats = df['q3'].value_counts()
    device_mapping = {1: 'Smartphone', 2: 'Tablet', 3: 'Computer'}
    
    output.append("\nDevice Usage for Search:")
    for val, count in device_stats.items():
        if pd.notna(val):
            output.append(f"  {device_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q4: Number of apartments visited
    visits_stats = df['q4'].value_counts()
    visits_mapping = {1: '1-3', 2: '4-7', 3: '7-10', 4: '10+'}
    
    output.append("\nApartments Visited Before Decision:")
    for val, count in visits_stats.items():
        if pd.notna(val):
            output.append(f"  {visits_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    return output

def analyze_important_features(df):
    """Analyze what features are most important (besides price)"""
    output = []
    output.append("\n=== IMPORTANT FEATURES (Besides Price) ===")
    
    features = {
        'q5_1': 'Area size (m²)',
        'q5_2': 'Number of rooms',
        'q5_3': 'Parking',
        'q5_4': 'Safe room (Mamad)',
        'q5_5': 'Proximity to shopping',
        'q5_6': 'Proximity to education/public institutions',
        'q5_7': 'Balcony/Garden',
        'q5_8': 'Furnished',
        'q5_9': 'Pet-friendly',
        'q5_10': 'Elevator',
        'q5_11': 'Floor level',
        'q5_12': 'Additional costs (Arnona, HOA)',
        'q5_13': 'Price relative to area'
    }
    
    feature_importance = {}
    for col, name in features.items():
        if col in df.columns:
            importance = df[col].sum()
            feature_importance[name] = importance
    
    # Sort by importance
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    output.append("\nTop Important Features:")
    for i, (feature, count) in enumerate(sorted_features[:10], 1):
        percentage = (count / len(df)) * 100
        output.append(f"  {i}. {feature}: {count} selections ({percentage:.1f}%)")
    
    return output

def analyze_pain_points(df):
    """Analyze difficulties and pain points in the search process"""
    output = []
    output.append("\n=== PAIN POINTS & DIFFICULTIES ===")
    
    # Q6: How challenging was the search process (1-5 scale)
    challenge_stats = df['q6'].value_counts().sort_index()
    challenge_mapping = {
        1: 'Not challenging at all',
        2: 'Slightly challenging',
        3: 'Moderately challenging',
        4: 'Very challenging',
        5: 'Extremely challenging'
    }
    
    output.append("\nSearch Process Challenge Level:")
    avg_challenge = df['q6'].mean()
    output.append(f"  Average challenge score: {avg_challenge:.2f}/5")
    for val, count in challenge_stats.items():
        if pd.notna(val):
            output.append(f"  {challenge_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q7: Specific difficulties encountered
    difficulties = {
        'q7_1': 'Finding apartment listings databases',
        'q7_2': 'Finding apartment meeting needs',
        'q7_3': 'Tracking search process',
        'q7_4': 'Organizing apartment details',
        'q7_5': 'Time-consuming process'
    }
    
    output.append("\nSpecific Difficulties Encountered:")
    difficulty_counts = {}
    for col, name in difficulties.items():
        if col in df.columns:
            count = df[col].sum()
            difficulty_counts[name] = count
    
    sorted_difficulties = sorted(difficulty_counts.items(), key=lambda x: x[1], reverse=True)
    for difficulty, count in sorted_difficulties:
        percentage = (count / len(df)) * 100
        output.append(f"  - {difficulty}: {count} ({percentage:.1f}%)")
    
    # Q8: Search duration
    duration_stats = df['q8'].value_counts().sort_index()
    duration_mapping = {
        1: 'Up to 1 month',
        2: '1-3 months',
        3: '3-6 months',
        4: 'Over 6 months'
    }
    
    output.append("\nSearch Duration:")
    for val, count in duration_stats.items():
        if pd.notna(val):
            output.append(f"  {duration_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    return output

def analyze_search_management(df):
    """Analyze how people manage their search process"""
    output = []
    output.append("\n=== SEARCH MANAGEMENT METHODS ===")
    
    # Q10: How they managed the search
    methods = {
        'q10_1': 'WhatsApp with self/partner',
        'q10_2': 'Excel file',
        'q10_3': 'Notes app',
        'q10_4': 'Pen and paper',
        'q10_5': 'Photos in gallery',
        'q10_6': 'Dedicated app'
    }
    
    output.append("\nSearch Management Tools Used:")
    method_usage = {}
    for col, name in methods.items():
        if col in df.columns:
            count = df[col].sum()
            method_usage[name] = count
    
    sorted_methods = sorted(method_usage.items(), key=lambda x: x[1], reverse=True)
    for method, count in sorted_methods:
        percentage = (count / len(df)) * 100
        output.append(f"  - {method}: {count} ({percentage:.1f}%)")
    
    # Q10_tv6: Open text field for app names
    if 'q10_tv6' in df.columns:
        app_mentions = df['q10_tv6'].dropna()
        if len(app_mentions) > 0:
            output.append(f"\nSpecific Apps Mentioned: {len(app_mentions)} responses")
            for app in app_mentions.unique()[:5]:
                output.append(f"  - {app}")
    
    return output

def analyze_willingness_to_pay(df):
    """Analyze willingness to pay for digital solutions"""
    output = []
    output.append("\n=== WILLINGNESS TO PAY FOR SOLUTIONS ===")
    
    # Q11: Payment scenarios
    payment_scenarios = df['q11'].value_counts().sort_index()
    scenario_mapping = {
        1: 'Prefer to do everything alone, even if less efficient',
        2: 'Willing to use helpful tools, but not always pay',
        3: 'If tool significantly helps, willing to pay small amount',
        4: 'If saves time/headache/errors - definitely consider paying'
    }
    
    output.append("\nPayment Willingness Scenarios:")
    for val, count in payment_scenarios.items():
        if pd.notna(val):
            output.append(f"  {scenario_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q12: Tendency to use paid digital services
    payment_tendency = df['q12'].value_counts().sort_index()
    tendency_mapping = {
        1: 'Never',
        2: 'Rarely',
        3: 'Often',
        4: 'Almost always'
    }
    
    output.append("\nTendency to Use Paid Digital Services:")
    for val, count in payment_tendency.items():
        if pd.notna(val):
            output.append(f"  {tendency_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Calculate percentage willing to pay (scenarios 3 & 4)
    willing_to_pay = df[df['q11'].isin([3, 4])].shape[0]
    output.append(f"\nOverall Willingness to Pay: {willing_to_pay}/{len(df)} ({willing_to_pay/len(df)*100:.1f}%)")
    
    return output

def analyze_user_personas(df):
    """Analyze user types and decision-making styles"""
    output = []
    output.append("\n=== USER PERSONAS & DECISION STYLES ===")
    
    # Q14: Decision-making style
    style_stats = df['q14'].value_counts()
    style_mapping = {
        1: 'Organized with clear steps',
        2: 'Intuitive and spontaneous',
        3: 'Consults others and listens to advice',
        4: 'Researches everything thoroughly',
        5: 'Reviews many options until confident'
    }
    
    output.append("\nDecision-Making Styles:")
    for val, count in style_stats.items():
        if pd.notna(val):
            output.append(f"  {style_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    # Q13: Reasons for giving up on apartments
    giveup_stats = df['q13'].value_counts()
    giveup_mapping = {
        1: 'Discovered issues only in conversation with advertiser',
        2: 'Discovered issues only when viewing apartment',
        3: 'Forgot to follow up with owner',
        4: 'Lost information about apartment',
        5: 'Someone else already took it'
    }
    
    output.append("\nReasons for Giving Up on Suitable Apartments:")
    for val, count in giveup_stats.items():
        if pd.notna(val):
            output.append(f"  {giveup_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    
    return output

def analyze_demographics(df):
    """Analyze demographic patterns"""
    output = []
    output.append("\n=== DEMOGRAPHIC INSIGHTS ===")
    
    # Check birth year and age data
    if 'byear' in df.columns:
        output.append("\nBirth year statistics:")
        output.append(f"  Min year: {df['byear'].min()}")
        output.append(f"  Max year: {df['byear'].max()}")
        output.append(f"  Missing values: {df['byear'].isna().sum()}")
        
        # Calculate age
        df['age'] = 2025 - df['byear']
        output.append(f"\nAge statistics:")
        output.append(f"  Min age: {df['age'].min()}")
        output.append(f"  Max age: {df['age'].max()}")
        output.append(f"  Average age: {df['age'].mean():.1f}")
    
    # Create age groups if needed
    if 'byear' in df.columns and 'agegr' not in df.columns:
        df['age'] = 2025 - df['byear']
        conditions = [
            (df['age'] >= 15) & (df['age'] <= 24),
            (df['age'] >= 25) & (df['age'] <= 34),
            (df['age'] >= 35) & (df['age'] <= 44),
            (df['age'] >= 45) & (df['age'] <= 54),
            (df['age'] >= 55) & (df['age'] <= 64),
            (df['age'] >= 65)
        ]
        choices = [1, 2, 3, 4, 5, 6]
        df['agegr'] = np.select(conditions, choices, default=0)
    
    # Age groups
    if 'agegr' in df.columns:
        age_groups = df[df['agegr'] > 0]['agegr'].value_counts().sort_index()
        age_mapping = {1: '15-24', 2: '25-34', 3: '35-44', 4: '45-54', 5: '55-64', 6: '65+'}
        
        output.append("\nAge Distribution:")
        for val, count in age_groups.items():
            output.append(f"  {age_mapping.get(int(val), val)}: {count} ({count/len(df)*100:.1f}%)")
    else:
        output.append("\nAge Distribution: Data not available")
    
    # Religious identification
    if 'relid' in df.columns:
        relid_stats = df['relid'].value_counts()
        relid_mapping = {1: 'Secular', 2: 'Traditional', 3: 'Religious', 4: 'Ultra-Orthodox'}
        
        output.append("\nReligious Identification:")
        for val, count in relid_stats.items():
            if pd.notna(val) and val in relid_mapping:
                output.append(f"  {relid_mapping[int(val)]}: {count} ({count/len(df)*100:.1f}%)")
    else:
        output.append("\nReligious Identification: Data not available")
    
    # Geographic distribution
    if 'nafa' in df.columns:
        location_stats = df['nafa'].value_counts()
        location_mapping = {
            1: 'Jerusalem', 2: 'North', 3: 'Haifa', 4: 'Center',
            5: 'Tel Aviv', 6: 'South', 7: 'Judea & Samaria', 8: 'Abroad'
        }
        
        output.append("\nGeographic Distribution:")
        for val, count in location_stats.items():
            if pd.notna(val) and val in location_mapping:
                output.append(f"  {location_mapping[int(val)]}: {count} ({count/len(df)*100:.1f}%)")
    else:
        output.append("\nGeographic Distribution: Data not available")
    
    return output

def generate_app_recommendations(df):
    """Generate specific recommendations for the rental app"""
    output = []
    output.append("\n=== APP DEVELOPMENT RECOMMENDATIONS ===")
    
    output.append("\n1. CORE FEATURES TO PRIORITIZE:")
    output.append("   - Advanced filtering by top criteria (parking, rooms, area size)")
    output.append("   - Location-based search (proximity to shopping/education)")
    output.append("   - Price comparison relative to area averages")
    output.append("   - Apartment comparison tool")
    
    output.append("\n2. PAIN POINT SOLUTIONS:")
    output.append("   - Centralized search across multiple platforms")
    output.append("   - Automatic tracking and organization of viewed apartments")
    output.append("   - Reminder system for follow-ups")
    output.append("   - Note-taking and photo organization per apartment")
    
    output.append("\n3. USER EXPERIENCE DESIGN:")
    output.append("   - Mobile-first approach (majority use smartphones)")
    output.append("   - Simple, intuitive interface for all user types")
    output.append("   - Support for Hebrew and potentially Arabic/Russian")
    output.append("   - Quick filters for most important features")
    
    output.append("\n4. MONETIZATION STRATEGY:")
    willing_percentage = (df[df['q11'].isin([3, 4])].shape[0] / len(df)) * 100
    output.append(f"   - {willing_percentage:.0f}% willing to pay for valuable features")
    output.append("   - Consider freemium model with premium features")
    output.append("   - Focus on time-saving and organization features for paid tier")
    output.append("   - Target users who search for 3+ months")
    
    output.append("\n5. DIFFERENTIATION OPPORTUNITIES:")
    output.append("   - Integration with WhatsApp for sharing/collaboration")
    output.append("   - AI-powered matching based on stated preferences")
    output.append("   - Automated alerts for new listings matching criteria")
    output.append("   - Virtual tour scheduling and management")
    
    return output

def create_basic_visualizations(df, output_dir):
    """Create basic visualization charts"""
    plt.figure(figsize=(15, 10))
    
    # Chart 1: Search type distribution
    plt.subplot(2, 3, 1)
    df['q1'].value_counts().plot(kind='bar')
    plt.title('Search Type Distribution')
    plt.xlabel('Type (1=Purchase, 2=Rent, 3=No search)')
    plt.ylabel('Count')
    
    # Chart 2: Challenge level
    plt.subplot(2, 3, 2)
    df['q6'].value_counts().sort_index().plot(kind='bar')
    plt.title('Search Challenge Level')
    plt.xlabel('Challenge Level (1-5)')
    plt.ylabel('Count')
    
    # Chart 3: Search duration
    plt.subplot(2, 3, 3)
    df['q8'].value_counts().sort_index().plot(kind='bar')
    plt.title('Search Duration')
    plt.xlabel('Duration (1=<1mo, 2=1-3mo, 3=3-6mo, 4=>6mo)')
    plt.ylabel('Count')
    
    # Chart 4: Willingness to pay
    plt.subplot(2, 3, 4)
    df['q11'].value_counts().sort_index().plot(kind='bar')
    plt.title('Willingness to Pay for Solutions')
    plt.xlabel('Scenario (1-4)')
    plt.ylabel('Count')
    
    # Chart 5: Device usage
    plt.subplot(2, 3, 5)
    df['q3'].value_counts().plot(kind='pie', autopct='%1.1f%%')
    plt.title('Device Usage for Search')
    
    # Chart 6: Age distribution
    plt.subplot(2, 3, 6)
    if 'agegr' in df.columns:
        df[df['agegr'] > 0]['agegr'].value_counts().sort_index().plot(kind='bar')
    plt.title('Age Group Distribution')
    plt.xlabel('Age Group')
    plt.ylabel('Count')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'basic_analysis_charts.png'), dpi=300, bbox_inches='tight')
    plt.close()

def run_basic_analysis(file_path=DEFAULT_FILE, show_plots=False):
    """Run all basic analyses"""
    output_dir = ensure_output_dir()
    
    all_output = []
    all_output.append("\n" + "="*80)
    all_output.append("RENTAL MARKET BASIC ANALYSIS")
    all_output.append("="*80)
    
    # Load and prepare data
    df, load_output = load_and_prepare_data(file_path)
    all_output.extend(load_output)
    
    # Run all analyses
    all_output.extend(analyze_search_behavior(df))
    all_output.extend(analyze_important_features(df))
    all_output.extend(analyze_pain_points(df))
    all_output.extend(analyze_search_management(df))
    all_output.extend(analyze_willingness_to_pay(df))
    all_output.extend(analyze_user_personas(df))
    all_output.extend(analyze_demographics(df))
    all_output.extend(generate_app_recommendations(df))
    
    # Save output to file
    with open(os.path.join(output_dir, 'basic_analysis_report.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_output))
    
    # Print to console
    print('\n'.join(all_output))
    
    # Create visualizations
    if show_plots:
        create_basic_visualizations(df, output_dir)
    
    return df

# Main execution
if __name__ == "__main__":
    run_basic_analysis()