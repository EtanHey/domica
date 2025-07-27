# Facebook Export Integration Analysis for Domica

## Overview

Analysis of integrating [facebook-export](https://github.com/KyleAMathews/facebook-export) tool for scraping Facebook rental groups.

## Tool Capabilities

### Data Extraction

- **Facebook group posts** ✅
- **Group members** ✅
- **Member activity information** ✅

### Technical Details

- **Runtime**: Node.js
- **Storage**: LevelDB databases (local at `~/.facebook-export`)
- **Installation**: `npm install -g facebook-export`
- **CLI Tools**:
  - `facebook-export`: Downloads and saves Facebook data
  - `facebook-analyze`: Inspects and analyzes downloaded data

### Authentication

- Requires Facebook API access token
- Needs "user_groups" permission
- Token obtained through Facebook's API Explorer
- Manual token generation required

### Unique Features

- Member activity scoring system
- Points for posts/comments/likes
- Activity decay: "1/2 life of six months"
- Export filtering by year/month

## Integration Feasibility ✅

### Proposed Architecture

```
Facebook Groups → facebook-export → Parser Service → AI/NLP Processing → Supabase
                                         ↓
                                   Hebrew Text Analysis
                                   Price Extraction
                                   Location Mapping
                                   Amenity Detection
```

### Data Pipeline

1. Use CLI to periodically fetch group data
2. Parse LevelDB output for rental posts
3. Transform to match Domica database schema
4. Upload to Supabase

## Critical Considerations

### 🚨 API Access Challenges

- Facebook has restricted API access post-Cambridge Analytica
- Group content access requires app review
- Tokens expire and need renewal
- Rate limiting applies

### Data Structure Mismatch

- Facebook posts are unstructured text
- Requires NLP/AI to extract:
  - Price
  - Location
  - Number of rooms
  - Amenities
- Hebrew text processing essential

### Legal/Compliance

- Facebook TOS restrictions on automated collection
- Israeli privacy law compliance
- May need group admin consent

## Required Information

1. **Facebook API Access**: Do you have a Facebook Developer account with an approved app?

2. **Target Groups**: Which specific rental groups? (names, sizes, posting frequency)

3. **Post Format**: Do landlords follow any posting template?

4. **Update Frequency**: How often to scrape? (considering API limits)

5. **Alternative Approach**: Would a browser extension be viable?

6. **Data Volume**: Expected posts per day?

## Example Usage

```bash
# List available groups
facebook-export -a <TOKEN> -l

# Export specific group data
facebook-export -a <TOKEN> -g <GROUP-ID> -d

# Analyze downloaded data
facebook-analyze
```

## Recommendation

The tool can work but main bottleneck will be Facebook API approval. Consider browser automation as fallback if API access is denied.
