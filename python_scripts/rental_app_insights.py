import pandas as pd
import numpy as np
from datetime import datetime
import os

# Default file path
DEFAULT_FILE = "results.csv"

# Use the same output directory
from rental_app_analysis import OUTPUT_DIR, ensure_output_dir

def extract_key_insights(file_path=DEFAULT_FILE):
    """Extract key insights for rental app development"""
    df = pd.read_csv(file_path)
    df_completed = df[df['stat'] == 1].copy()
    
    output = []
    output.append("=" * 60)
    output.append("ISRAEL RENTAL MARKET INSIGHTS FOR APP DEVELOPMENT")
    output.append("=" * 60)
    output.append(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d')}")
    output.append(f"Total Completed Responses: {len(df_completed)}")
    output.append("=" * 60)
    
    # 1. Market Opportunity Analysis
    output.append("\n📊 MARKET OPPORTUNITY ANALYSIS")
    output.append("-" * 40)
    
    # Active searchers
    active_searchers = df_completed[df_completed['q1'].isin([1, 2])].shape[0]
    purchase_searchers = df_completed[df_completed['q1'] == 1].shape[0]
    rental_searchers = df_completed[df_completed['q1'] == 2].shape[0]
    
    output.append(f"Active Market Size:")
    output.append(f"  • Total active searchers: {active_searchers} ({active_searchers/len(df_completed)*100:.1f}%)")
    output.append(f"  • Purchase market: {purchase_searchers} ({purchase_searchers/len(df_completed)*100:.1f}%)")
    output.append(f"  • Rental market: {rental_searchers} ({rental_searchers/len(df_completed)*100:.1f}%)")
    
    # Long searchers (potential high-value users)
    long_searchers = df_completed[df_completed['q8'].isin([3, 4])].shape[0]
    output.append(f"\nHigh-Value User Segment:")
    output.append(f"  • Searching 3+ months: {long_searchers} ({long_searchers/len(df_completed)*100:.1f}%)")
    
    # High challenge users
    high_challenge = df_completed[df_completed['q6'] >= 4].shape[0]
    output.append(f"  • Finding it very challenging: {high_challenge} ({high_challenge/len(df_completed)*100:.1f}%)")
    
    # 2. Feature Priority Matrix
    output.append("\n🎯 FEATURE PRIORITY MATRIX")
    output.append("-" * 40)
    
    # Most requested features
    feature_cols = [f'q5_{i}' for i in range(1, 14)]
    feature_names = [
        'Area size', 'Rooms', 'Parking', 'Safe room', 'Shopping proximity',
        'Education proximity', 'Balcony/Garden', 'Furnished', 'Pet-friendly',
        'Elevator', 'Floor', 'Extra costs', 'Price/Area ratio'
    ]
    
    feature_priorities = []
    for col, name in zip(feature_cols, feature_names):
        if col in df_completed.columns:
            priority_score = df_completed[col].sum() / len(df_completed) * 100
            feature_priorities.append((name, priority_score))
    
    feature_priorities.sort(key=lambda x: x[1], reverse=True)
    
    output.append("Must-Have Features (>40% users):")
    for feature, score in feature_priorities:
        if score > 40:
            output.append(f"  ✓ {feature}: {score:.1f}%")
    
    output.append("\nNice-to-Have Features (20-40% users):")
    for feature, score in feature_priorities:
        if 20 <= score <= 40:
            output.append(f"  • {feature}: {score:.1f}%")
    
    # 3. User Pain Points & Solutions
    output.append("\n🔥 CRITICAL PAIN POINTS & APP SOLUTIONS")
    output.append("-" * 40)
    
    pain_points = {
        'q7_5': ('Time-consuming process', 'AI-powered instant matching'),
        'q7_2': ('Finding suitable apartments', 'Smart filters & saved searches'),
        'q7_3': ('Tracking search process', 'Built-in CRM & progress tracker'),
        'q7_4': ('Organizing apartment details', 'Comparison table & notes'),
        'q7_1': ('Finding listing databases', 'Aggregated multi-platform search')
    }
    
    for col, (pain, solution) in pain_points.items():
        if col in df_completed.columns:
            affected = df_completed[col].sum()
            percentage = affected / len(df_completed) * 100
            output.append(f"\nPain: {pain}")
            output.append(f"  Affected users: {percentage:.1f}%")
            output.append(f"  → Solution: {solution}")
    
    # 4. User Behavior Insights
    output.append("\n👥 USER BEHAVIOR INSIGHTS")
    output.append("-" * 40)
    
    # Device usage
    smartphone_users = df_completed[df_completed['q3'] == 1].shape[0]
    tablet_users = df_completed[df_completed['q3'] == 2].shape[0]
    computer_users = df_completed[df_completed['q3'] == 3].shape[0]
    
    output.append("Platform Priority:")
    output.append(f"  📱 Smartphone: {smartphone_users/len(df_completed)*100:.1f}% → Mobile-first design")
    output.append(f"  💻 Computer: {computer_users/len(df_completed)*100:.1f}% → Web app needed")
    output.append(f"  📱 Tablet: {tablet_users/len(df_completed)*100:.1f}% → Responsive design")
    
    # Current tools usage
    output.append("\nCurrent Tool Usage (shows integration opportunities):")
    tools = {
        'q10_1': 'WhatsApp',
        'q10_5': 'Photo galleries',
        'q10_3': 'Notes apps',
        'q10_2': 'Excel',
        'q10_4': 'Pen & paper'
    }
    
    for col, tool in tools.items():
        if col in df_completed.columns:
            users = df_completed[col].sum()
            output.append(f"  • {tool}: {users/len(df_completed)*100:.1f}%")
    
    # 5. Monetization Insights
    output.append("\n💰 MONETIZATION STRATEGY")
    output.append("-" * 40)
    
    # Willingness to pay analysis
    definitely_pay = df_completed[df_completed['q11'] == 4].shape[0]
    maybe_pay = df_completed[df_completed['q11'] == 3].shape[0]
    total_potential = definitely_pay + maybe_pay
    
    output.append("Revenue Potential:")
    output.append(f"  • Definitely willing to pay: {definitely_pay/len(df_completed)*100:.1f}%")
    output.append(f"  • Conditionally willing: {maybe_pay/len(df_completed)*100:.1f}%")
    output.append(f"  • Total addressable: {total_potential/len(df_completed)*100:.1f}%")
    
    # Payment behavior
    often_pays = df_completed[df_completed['q12'].isin([3, 4])].shape[0]
    output.append(f"  • Regular digital service payers: {often_pays/len(df_completed)*100:.1f}%")
    
    # 6. Competitive Advantage Opportunities
    output.append("\n🚀 COMPETITIVE ADVANTAGE OPPORTUNITIES")
    output.append("-" * 40)
    
    # Lost opportunities analysis
    forgot_followup = df_completed[df_completed['q13'] == 3].shape[0]
    lost_info = df_completed[df_completed['q13'] == 4].shape[0]
    too_late = df_completed[df_completed['q13'] == 5].shape[0]
    
    output.append("Preventable Loss Reasons (app can solve):")
    output.append(f"  • Forgot to follow up: {forgot_followup/len(df_completed)*100:.1f}% → Automated reminders")
    output.append(f"  • Lost apartment info: {lost_info/len(df_completed)*100:.1f}% → Organized saved listings")
    output.append(f"  • Someone else took it: {too_late/len(df_completed)*100:.1f}% → Instant notifications")
    
    # 7. User Segmentation
    output.append("\n🎭 USER PERSONAS FOR TARGETED FEATURES")
    output.append("-" * 40)
    
    # Decision styles
    organized = df_completed[df_completed['q14'] == 1].shape[0]
    spontaneous = df_completed[df_completed['q14'] == 2].shape[0]
    social = df_completed[df_completed['q14'] == 3].shape[0]
    researcher = df_completed[df_completed['q14'] == 4].shape[0]
    cautious = df_completed[df_completed['q14'] == 5].shape[0]
    
    output.append("Decision-Making Personas:")
    output.append(f"  📋 Organized Planner: {organized/len(df_completed)*100:.1f}% → Structured workflows")
    output.append(f"  ⚡ Spontaneous Actor: {spontaneous/len(df_completed)*100:.1f}% → Quick actions")
    output.append(f"  👥 Social Validator: {social/len(df_completed)*100:.1f}% → Sharing features")
    output.append(f"  🔍 Deep Researcher: {researcher/len(df_completed)*100:.1f}% → Detailed data")
    output.append(f"  🎯 Cautious Reviewer: {cautious/len(df_completed)*100:.1f}% → Comparison tools")
    
    # 8. Regional Insights
    output.append("\n📍 GEOGRAPHIC MARKET DISTRIBUTION")
    output.append("-" * 40)
    
    regions = {
        1: 'Jerusalem', 2: 'North', 3: 'Haifa', 4: 'Center',
        5: 'Tel Aviv', 6: 'South', 7: 'Judea & Samaria'
    }
    
    output.append("Top Markets:")
    if 'nafa' in df_completed.columns:
        region_dist = df_completed['nafa'].value_counts()
        for region_code, count in region_dist.head(5).items():
            if region_code in regions:
                output.append(f"  • {regions[region_code]}: {count/len(df_completed)*100:.1f}%")
    
    # 9. App Development Roadmap
    output.append("\n🗺️ RECOMMENDED DEVELOPMENT ROADMAP")
    output.append("-" * 40)
    
    output.append("Phase 1 - MVP (3 months):")
    output.append("  ✓ Multi-platform search aggregation")
    output.append("  ✓ Smart filters (parking, rooms, area)")
    output.append("  ✓ Save & compare apartments")
    output.append("  ✓ Basic note-taking per listing")
    output.append("  ✓ WhatsApp sharing integration")
    
    output.append("\nPhase 2 - Growth (3-6 months):")
    output.append("  ✓ AI-powered matching algorithm")
    output.append("  ✓ Automated follow-up reminders")
    output.append("  ✓ Price trend analysis by area")
    output.append("  ✓ Virtual tour scheduling")
    output.append("  ✓ Collaborative search (couples/families)")
    
    output.append("\nPhase 3 - Monetization (6-9 months):")
    output.append("  ✓ Premium instant notifications")
    output.append("  ✓ Advanced analytics & insights")
    output.append("  ✓ Priority support & concierge")
    output.append("  ✓ Realtor marketplace integration")
    output.append("  ✓ Moving services marketplace")
    
    # 10. Success Metrics
    output.append("\n📈 KEY SUCCESS METRICS TO TRACK")
    output.append("-" * 40)
    
    output.append("User Acquisition:")
    output.append(f"  • Target market: ~{active_searchers/len(df_completed)*100:.0f}% of population")
    output.append(f"  • High-value segment: ~{long_searchers/len(df_completed)*100:.0f}% (3+ month searchers)")
    
    output.append("\nEngagement Metrics:")
    output.append("  • Avg apartments viewed before decision: Track reduction")
    output.append("  • Search duration: Aim to reduce from 3-6 months average")
    output.append("  • Follow-up success rate: Reduce the ~20% who forget")
    
    output.append("\nMonetization Metrics:")
    output.append(f"  • Conversion potential: {total_potential/len(df_completed)*100:.0f}% willing to pay")
    output.append("  • Target ARPU: ₪20-50/month based on market")
    
    return df_completed, output

def generate_feature_spec(df):
    """Generate detailed feature specifications based on data"""
    output = []
    output.append("\n" + "=" * 60)
    output.append("DETAILED FEATURE SPECIFICATIONS")
    output.append("=" * 60)
    
    output.append("\n🔧 CORE FEATURE SET")
    output.append("-" * 40)
    
    output.append("\n1. SMART SEARCH ENGINE")
    output.append("   Input: Multi-parameter search")
    output.append("   Sources: Yad2, OnMap, Facebook Groups, etc.")
    output.append("   Filters:")
    output.append("     - Location (with proximity radius)")
    output.append("     - Price range + relative to area average")
    output.append("     - Rooms, area size, floor")
    output.append("     - Must-haves: Parking, elevator, safe room")
    output.append("     - Nice-to-haves: Balcony, pet-friendly, furnished")
    
    output.append("\n2. APARTMENT ORGANIZER")
    output.append("   Features:")
    output.append("     - Swipe interface (like/dislike)")
    output.append("     - Automatic data extraction from listings")
    output.append("     - Custom notes & voice memos per apartment")
    output.append("     - Photo gallery with annotation")
    output.append("     - Status tracking (contacted, viewed, applied)")
    
    output.append("\n3. COMPARISON ENGINE")
    output.append("   Features:")
    output.append("     - Side-by-side comparison (up to 4)")
    output.append("     - Weighted scoring based on preferences")
    output.append("     - Price per m² calculator")
    output.append("     - Commute time calculator")
    output.append("     - Total monthly cost estimator")
    
    output.append("\n4. COLLABORATION TOOLS")
    output.append("   Features:")
    output.append("     - Share lists via WhatsApp/link")
    output.append("     - Joint decision making for couples")
    output.append("     - Comments & ratings per user")
    output.append("     - Viewing schedule coordinator")
    
    output.append("\n5. SMART NOTIFICATIONS")
    output.append("   Types:")
    output.append("     - New matches for saved searches")
    output.append("     - Price drops on saved apartments")
    output.append("     - Follow-up reminders")
    output.append("     - Viewing appointment reminders")
    output.append("     - Market insights for your areas")
    
    return output

def run_insights_analysis(file_path=DEFAULT_FILE):
    """Run insights analysis and return dataframe"""
    output_dir = ensure_output_dir()
    
    df, insights_output = extract_key_insights(file_path)
    spec_output = generate_feature_spec(df)
    
    # Combine all output
    all_output = insights_output + spec_output
    
    # Save to file
    with open(os.path.join(output_dir, 'insights_analysis_report.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_output))
    
    # Print to console
    print('\n'.join(all_output))
    
    return df

# Execute the analysis
if __name__ == "__main__":
    run_insights_analysis()