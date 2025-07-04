#!/usr/bin/env python3
"""
Main Runner Script for Israel Rental Market Analysis
Executes all three analysis scripts and generates comprehensive insights
"""

import sys
import os
from datetime import datetime

# Import the three analysis modules
try:
    from rental_app_analysis import run_basic_analysis, OUTPUT_DIR
    from rental_app_insights import run_insights_analysis
    from rental_app_visualizations import run_visual_analysis
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure all three analysis scripts are in the same directory:")
    print("  - rental_app_analysis.py")
    print("  - rental_app_insights.py")
    print("  - rental_app_visualizations.py")
    sys.exit(1)

def main():
    """Run all analyses on the rental market data"""
    
    # Check if results.csv exists
    if not os.path.exists("results.csv"):
        print("ERROR: 'results.csv' not found in current directory!")
        print("Please ensure the CSV file is in the same directory as this script.")
        sys.exit(1)
    
    print("="*80)
    print("ISRAEL RENTAL MARKET COMPREHENSIVE ANALYSIS")
    print("="*80)
    print(f"Analysis Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Output Directory: {OUTPUT_DIR}")
    print("="*80)
    
    try:
        # 1. Run Basic Analysis
        print("\n📊 PHASE 1: BASIC MARKET ANALYSIS")
        print("-"*80)
        df1 = run_basic_analysis(show_plots=True)
        print("\n✓ Basic analysis completed")
        
        # 2. Run Insights Analysis
        print("\n💡 PHASE 2: STRATEGIC INSIGHTS ANALYSIS")
        print("-"*80)
        df2 = run_insights_analysis()
        print("\n✓ Insights analysis completed")
        
        # 3. Run Visual Analysis
        print("\n📈 PHASE 3: VISUAL DASHBOARD GENERATION")
        print("-"*80)
        df3 = run_visual_analysis()
        print("\n✓ Visual dashboard completed")
        
        # Summary
        print("\n" + "="*80)
        print("ANALYSIS COMPLETE!")
        print("="*80)
        print(f"\n📁 All outputs saved to: {OUTPUT_DIR}/")
        print("\nGenerated Files:")
        print("  Reports:")
        print("    • basic_analysis_report.txt - Detailed market analysis")
        print("    • insights_analysis_report.txt - Strategic insights")
        print("  Visualizations:")
        print("    • basic_analysis_charts.png - Overview charts")
        print("    • 01_market_overview.png through 12_key_metrics.png - Individual charts")
        print("    • rental_market_dashboard.png - Complete dashboard")
        
        print("\n🎯 Key Takeaways:")
        print("  • Check the reports for detailed insights")
        print("  • Review individual charts for specific metrics")
        print("  • Use insights to guide app development priorities")
        
        print("\n💼 Recommended Next Steps:")
        print("  1. Review the pain points analysis for feature priorities")
        print("  2. Check willingness-to-pay data for pricing strategy")
        print("  3. Analyze user personas for UX design decisions")
        print("  4. Use geographic data for market entry strategy")
        
        print(f"\nAnalysis End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ ERROR during analysis: {e}")
        print("Please check that:")
        print("  1. All required packages are installed (pandas, numpy, matplotlib, seaborn)")
        print("  2. The results.csv file is properly formatted")
        print("  3. All analysis scripts are in the current directory")
        raise

if __name__ == "__main__":
    main()