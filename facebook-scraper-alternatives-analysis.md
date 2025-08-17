# Facebook Scraper Alternatives Analysis (No API Required)

## 1. facebook-scraper Python Package ⭐ RECOMMENDED

### Overview

- **GitHub**: [kevinzg/facebook-scraper](https://github.com/kevinzg/facebook-scraper)
- **Install**: `pip install facebook-scraper`
- **No API key required**
- **Actively maintained** (2024)

### Capabilities

✅ **Supports Facebook Groups**
✅ **No authentication required** (for public content)
✅ **Extracts comprehensive data**

### Data Fields Available

- Post text, time, likes, shares, comments
- Post ID, user ID, username
- Comments with commenter names and timestamps
- Profile information
- Images and galleries

### Group Scraping Specifics

```python
from facebook_scraper import get_posts

# Scrape group posts
for post in get_posts(group='GROUP_ID_OR_NAME', pages=5):
    print(post['text'])
    print(post['time'])
    print(post['likes'])
```

### ⚠️ Limitations

- Group posts may miss some fields (time, post_url)
- Only works on public groups
- May return limited pages for groups
- IP ban risk if scraping too aggressively
- Hebrew text: Not explicitly mentioned but Python handles Unicode

### Usage Example for Rentals

```python
from facebook_scraper import get_posts
import re

def extract_rental_info(post_text):
    # Extract price (looking for ₪ symbol)
    price_match = re.search(r'₪\s*(\d+)', post_text)

    # Extract rooms
    rooms_match = re.search(r'(\d+)\s*חדרים', post_text)

    return {
        'price': price_match.group(1) if price_match else None,
        'rooms': rooms_match.group(1) if rooms_match else None,
        'text': post_text
    }

# Scrape rental group
for post in get_posts(group='rental_group_name', pages=10):
    rental_info = extract_rental_info(post['text'])
    print(rental_info)
```

## 2. Playwright/Puppeteer Browser Automation

### Advantages

- Full browser simulation (harder to detect)
- Handles JavaScript-rendered content
- Can login and access private groups
- Complete control over scraping logic

### Disadvantages

- More complex to implement
- Requires more resources
- Slower than direct API calls
- Still detectable with sophisticated methods

### Example Architecture

```python
from playwright.sync_api import sync_playwright

def scrape_facebook_group(group_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Login process
        page.goto('https://facebook.com')
        # ... login steps ...

        # Navigate to group
        page.goto(group_url)

        # Scroll and collect posts
        posts = []
        # ... scraping logic ...

        browser.close()
    return posts
```

## 3. facebook-page-scraper Package

- Alternative Python package
- Focuses on Facebook pages (not groups)
- No webdriver required
- Limited to page information

## Recommendation for Domica

### Best Approach: Hybrid Solution

1. **Primary**: Use `facebook-scraper` for initial implementation
   - Quick to implement
   - No authentication complexity
   - Good for public groups

2. **Fallback**: Playwright for advanced needs
   - When login is required
   - For private groups
   - More control over data extraction

### Implementation Strategy

```python
# 1. Install facebook-scraper
pip install facebook-scraper

# 2. Create rental parser
class FacebookRentalScraper:
    def __init__(self, group_names):
        self.groups = group_names

    def scrape_rentals(self):
        rentals = []
        for group in self.groups:
            try:
                for post in get_posts(group=group, pages=5):
                    rental = self.parse_rental_post(post)
                    if rental:
                        rentals.append(rental)
            except Exception as e:
                print(f"Error scraping {group}: {e}")
        return rentals

    def parse_rental_post(self, post):
        # Hebrew text parsing logic
        # Extract: price, location, rooms, amenities
        # Return structured data for Supabase
        pass
```

### Key Considerations

1. **Rate Limiting**: Add delays between requests
2. **IP Rotation**: Consider proxy services if scaling
3. **Data Validation**: Hebrew text may need special handling
4. **Legal Compliance**: Only scrape public groups
5. **Monitoring**: Track success/failure rates

### Next Steps

1. Test `facebook-scraper` with actual rental groups
2. Develop Hebrew text parser for rental details
3. Create data pipeline to Supabase
4. Implement error handling and retries
5. Add monitoring and alerts

## Legal Note

While scraping public data is generally legal (per 2022 court ruling), Facebook actively opposes it. Ensure compliance with local laws and Facebook's ToS.
