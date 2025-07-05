#!/usr/bin/env python3
"""
Facebook Group Rental Scraper
For personal use only - respects rate limits and ethical scraping practices
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import random
import time
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

@dataclass
class RentalListing:
    """Data structure for rental listings"""
    facebook_id: str
    title: str
    listing_url: str
    scraped_at: datetime
    group_id: str
    group_name: str
    price_per_month: Optional[float] = None
    currency: str = "ILS"  # Default to Israeli Shekel
    description: Optional[str] = None
    location_text: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    property_type: Optional[str] = None
    landlord_name: Optional[str] = None
    landlord_profile_url: Optional[str] = None
    available_date: Optional[str] = None
    image_urls: List[str] = None
    amenities: List[str] = None
    
    def __post_init__(self):
        if self.image_urls is None:
            self.image_urls = []
        if self.amenities is None:
            self.amenities = []


class FacebookGroupScraper:
    """Facebook Group rental scraper using Playwright"""
    
    def __init__(self, email: str = None, password: str = None, headless: bool = False):
        self.email = email or os.getenv('FACEBOOK_EMAIL')
        self.password = password or os.getenv('FACEBOOK_PASSWORD')
        self.headless = headless
        self.logger = self._setup_logger()
        self.listings: List[RentalListing] = []
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        
        # Supabase client
        self.supabase: Client = create_client(
            os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        )
        
        # Rate limiting
        self.min_delay = 2.0
        self.max_delay = 5.0
        
        # Israeli amenities
        self.israeli_amenities = {
            'ממ״ד': ['ממד', 'ממ"ד', 'מרחב מוגן'],
            'מרפסת': ['מרפסת'],
            'חניה': ['חניה', 'חנייה'],
            'מעלית': ['מעלית'],
            'מזגן': ['מזגן', 'מיזוג'],
            'דוד שמש': ['דוד שמש', 'דוד'],
            'ריהוט': ['מרוהטת', 'ריהוט', 'מרוהט'],
            'כניסה מיידית': ['כניסה מיידית', 'מיידי', 'פנויה'],
            'משופצת': ['משופצת', 'שיפוץ', 'חדשה'],
            'מחסן': ['מחסן'],
            'גישה לנכים': ['גישה לנכים', 'נגיש'],
        }
    
    def _setup_logger(self) -> logging.Logger:
        """Configure logging"""
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    async def _random_delay(self):
        """Random delay to mimic human behavior"""
        delay = random.uniform(self.min_delay, self.max_delay)
        self.logger.info(f"Waiting {delay:.2f} seconds...")
        await asyncio.sleep(delay)
    
    async def _scroll_page(self, page: Page, scrolls: int = 3):
        """Scroll page to load more content"""
        for i in range(scrolls):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1, 2))
    
    async def _login_to_facebook(self):
        """Login to Facebook if credentials are provided"""
        if not self.email or not self.password:
            self.logger.warning("No Facebook credentials provided, scraping will be limited")
            return
        
        self.logger.info("Logging into Facebook...")
        
        try:
            # Navigate to Facebook
            await self.page.goto('https://www.facebook.com', wait_until='networkidle')
            
            # Check if already logged in
            if await self.page.query_selector('[aria-label="Your profile"]'):
                self.logger.info("Already logged in")
                return
            
            # Fill login form
            await self.page.fill('input[name="email"]', self.email)
            await self.page.fill('input[name="pass"]', self.password)
            
            # Click login button
            await self.page.click('button[name="login"]')
            
            # Wait for navigation
            await self.page.wait_for_navigation(wait_until='networkidle', timeout=30000)
            
            # Check if login successful
            if await self.page.query_selector('[aria-label="Your profile"]'):
                self.logger.info("Login successful")
            else:
                self.logger.warning("Login may have failed, continuing anyway")
                
        except Exception as e:
            self.logger.error(f"Login error: {e}")
    
    def _extract_price(self, text: str) -> Optional[float]:
        """Extract price from Hebrew/English text"""
        if not text:
            return None
        
        # Remove commas and normalize
        text = text.replace(',', '')
        
        # Look for price patterns
        patterns = [
            r'₪\s*(\d+)',  # ₪ symbol
            r'(\d+)\s*₪',  # Reversed
            r'(\d+)\s*ש[״\'״]ח',  # Shekel in Hebrew
            r'(\d+)\s*NIS',  # NIS
            r'\$\s*(\d+)',  # USD
            r'(\d+)\s*\$',  # USD reversed
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    pass
        
        return None
    
    def _extract_rooms_info(self, text: str) -> Tuple[Optional[int], Optional[float]]:
        """Extract room count from Hebrew/English text"""
        bedrooms = None
        bathrooms = None
        
        # Hebrew patterns
        room_patterns = [
            r'(\d+(?:\.\d+)?)\s*חדרים',
            r'(\d+(?:\.\d+)?)\s*חד[׳\']',
            r'דירת\s*(\d+(?:\.\d+)?)\s*חדרים',
        ]
        
        for pattern in room_patterns:
            match = re.search(pattern, text)
            if match:
                rooms = float(match.group(1))
                # In Israel, rooms include living room, so bedrooms = rooms - 1
                if rooms > 1:
                    bedrooms = int(rooms - 1)
                else:
                    bedrooms = 0
                break
        
        # English patterns as fallback
        if bedrooms is None:
            bed_match = re.search(r'(\d+)\s*(?:bed|bedroom)', text, re.IGNORECASE)
            if bed_match:
                bedrooms = int(bed_match.group(1))
        
        # Bathroom patterns
        bath_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:bath|bathroom|שירותים|מקלחת)',
        ]
        
        for pattern in bath_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                bathrooms = float(match.group(1))
                break
        
        return bedrooms, bathrooms
    
    def _detect_amenities(self, text: str) -> List[str]:
        """Detect Israeli amenities from text"""
        found_amenities = []
        text_lower = text.lower()
        
        for amenity, keywords in self.israeli_amenities.items():
            if any(keyword in text for keyword in keywords):
                found_amenities.append(amenity)
        
        return found_amenities
    
    def _extract_facebook_id(self, url: str) -> str:
        """Extract Facebook post ID from URL"""
        # Pattern for posts in groups
        patterns = [
            r'/groups/\d+/posts/(\d+)',
            r'/groups/\d+/permalink/(\d+)',
            r'/permalink/(\d+)',
            r'story_fbid=(\d+)',
            r'/posts/(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        # Fallback to hash of URL
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()[:16]
    
    async def scrape_group_post(self, post_element, group_id: str, group_name: str) -> Optional[RentalListing]:
        """Extract rental information from a Facebook group post"""
        try:
            # Get post text
            text_elements = await post_element.query_selector_all('[data-ad-preview="message"], [data-testid="post_message"]')
            post_text = ""
            for elem in text_elements:
                text = await elem.text_content()
                if text:
                    post_text += text + " "
            
            if not post_text:
                return None
            
            # Skip if not rental related
            rental_keywords = ['השכרה', 'להשכרה', 'דירה', 'חדרים', 'for rent', 'apartment', 'flat']
            if not any(keyword in post_text.lower() for keyword in rental_keywords):
                return None
            
            # Get post URL
            link_element = await post_element.query_selector('a[role="link"][href*="/groups/"]')
            post_url = ""
            if link_element:
                href = await link_element.get_attribute('href')
                if href:
                    post_url = f"https://www.facebook.com{href}" if not href.startswith('http') else href
            
            # Extract landlord info
            author_element = await post_element.query_selector('strong')
            landlord_name = await author_element.text_content() if author_element else None
            
            # Extract images
            image_urls = []
            img_elements = await post_element.query_selector_all('img[referrerpolicy="origin-when-cross-origin"]')
            for img in img_elements[:5]:  # Limit to 5 images
                src = await img.get_attribute('src')
                if src and 'scontent' in src:
                    image_urls.append(src)
            
            # Create listing
            listing = RentalListing(
                facebook_id=self._extract_facebook_id(post_url),
                title=post_text[:100] + "..." if len(post_text) > 100 else post_text,
                listing_url=post_url,
                scraped_at=datetime.now(),
                group_id=group_id,
                group_name=group_name,
                description=post_text,
                landlord_name=landlord_name,
                image_urls=image_urls,
            )
            
            # Extract structured data
            listing.price_per_month = self._extract_price(post_text)
            listing.bedrooms, listing.bathrooms = self._extract_rooms_info(post_text)
            listing.amenities = self._detect_amenities(post_text)
            
            # Detect property type
            if 'דירה' in post_text or 'apartment' in post_text.lower():
                listing.property_type = 'apartment'
            elif 'בית' in post_text or 'house' in post_text.lower():
                listing.property_type = 'house'
            elif 'חדר' in post_text or 'room' in post_text.lower():
                listing.property_type = 'room'
            
            return listing
            
        except Exception as e:
            self.logger.error(f"Error parsing post: {e}")
            return None
    
    async def scrape_facebook_group(self, group_url: str, max_posts: int = 20) -> List[RentalListing]:
        """Scrape rental listings from a Facebook group"""
        # Extract group ID from URL
        group_id_match = re.search(r'/groups/(\d+)', group_url)
        if not group_id_match:
            self.logger.error(f"Invalid group URL: {group_url}")
            return []
        
        group_id = group_id_match.group(1)
        
        self.logger.info(f"Navigating to group: {group_url}")
        await self.page.goto(group_url, wait_until='networkidle')
        
        # Get group name
        group_name_element = await self.page.query_selector('h1')
        group_name = await group_name_element.text_content() if group_name_element else f"Group {group_id}"
        
        self.logger.info(f"Scraping group: {group_name}")
        
        # Scroll to load more posts
        await self._scroll_page(self.page, scrolls=5)
        
        # Find all posts
        posts = await self.page.query_selector_all('[role="article"]')
        self.logger.info(f"Found {len(posts)} posts")
        
        scraped_count = 0
        for post in posts:
            if scraped_count >= max_posts:
                break
            
            listing = await self.scrape_group_post(post, group_id, group_name)
            if listing:
                self.listings.append(listing)
                scraped_count += 1
                self.logger.info(f"Scraped listing {scraped_count}/{max_posts}: {listing.title[:50]}...")
                
                # Save to Supabase immediately
                await self.save_listing_to_supabase(listing)
                
                await self._random_delay()
        
        return self.listings
    
    async def save_listing_to_supabase(self, listing: RentalListing):
        """Save a single listing to Supabase"""
        try:
            # Check if rental already exists
            existing = self.supabase.table('rentals').select('id').eq('facebook_id', listing.facebook_id).execute()
            
            if existing.data:
                self.logger.info(f"Listing {listing.facebook_id} already exists, skipping")
                return
            
            # Insert rental
            rental_data = {
                'facebook_id': listing.facebook_id,
                'title': listing.title,
                'description': listing.description,
                'price_per_month': listing.price_per_month,
                'currency': listing.currency,
                'location_text': listing.location_text,
                'bedrooms': listing.bedrooms,
                'bathrooms': listing.bathrooms,
                'property_type': listing.property_type,
                'available_date': listing.available_date,
                'is_active': True,
                'scraped_at': listing.scraped_at.isoformat(),
            }
            
            rental_result = self.supabase.table('rentals').insert(rental_data).execute()
            
            if rental_result.data:
                rental_id = rental_result.data[0]['id']
                
                # Insert images
                if listing.image_urls:
                    for idx, img_url in enumerate(listing.image_urls):
                        image_data = {
                            'rental_id': rental_id,
                            'image_url': img_url,
                            'image_order': idx,
                            'is_primary': idx == 0
                        }
                        self.supabase.table('rental_images').insert(image_data).execute()
                
                # Insert amenities
                if listing.amenities:
                    # Get amenity IDs
                    amenity_results = self.supabase.table('amenities').select('id, name').execute()
                    amenity_map = {a['name']: a['id'] for a in amenity_results.data}
                    
                    for amenity_name in listing.amenities:
                        if amenity_name in amenity_map:
                            rental_amenity_data = {
                                'rental_id': rental_id,
                                'amenity_id': amenity_map[amenity_name]
                            }
                            self.supabase.table('rental_amenities').insert(rental_amenity_data).execute()
                
                # Insert scrape metadata
                metadata = {
                    'rental_id': rental_id,
                    'source_url': listing.listing_url,
                    'source_type': 'facebook_group',
                    'source_id': listing.group_id,
                    'source_name': listing.group_name,
                }
                self.supabase.table('scrape_metadata').insert(metadata).execute()
                
                self.logger.info(f"Saved listing {listing.facebook_id} to Supabase")
                
        except Exception as e:
            self.logger.error(f"Error saving to Supabase: {e}")
    
    async def start(self):
        """Initialize browser and page"""
        playwright = await async_playwright().start()
        
        # Use Chrome for better Facebook compatibility
        self.browser = await playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )
        
        # Create context with realistic viewport and user agent
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        )
        
        self.page = await context.new_page()
        
        # Login if credentials provided
        await self._login_to_facebook()
    
    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
    
    def save_to_json(self, filename: str = "fb_group_rentals.json"):
        """Save scraped listings to JSON"""
        data = {
            "scraped_at": datetime.now().isoformat(),
            "total_listings": len(self.listings),
            "listings": [asdict(listing) for listing in self.listings]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Saved {len(self.listings)} listings to {filename}")


async def main():
    """Main function to run the scraper"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Facebook Group Rental Scraper")
    parser.add_argument("--group", type=str, help="Facebook group URL to scrape")
    parser.add_argument("--max-posts", type=int, default=20, help="Maximum posts to scrape")
    parser.add_argument("--email", type=str, help="Facebook email (or set FACEBOOK_EMAIL env var)")
    parser.add_argument("--password", type=str, help="Facebook password (or set FACEBOOK_PASSWORD env var)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--json", action="store_true", help="Output JSON for API")
    
    args = parser.parse_args()
    
    if args.json and not args.group:
        # API status check
        result = {
            "status": "ready",
            "message": "Facebook group scraper is ready",
            "requires_auth": not (args.email or os.getenv('FACEBOOK_EMAIL')),
            "note": "For personal use only"
        }
        print(json.dumps(result))
        return
    
    if not args.group:
        print("Error: --group URL is required")
        return
    
    scraper = FacebookGroupScraper(
        email=args.email,
        password=args.password,
        headless=args.headless
    )
    
    try:
        await scraper.start()
        listings = await scraper.scrape_facebook_group(args.group, args.max_posts)
        
        if args.json:
            result = {
                "status": "success",
                "group_url": args.group,
                "listings_found": len(listings),
                "message": f"Successfully scraped {len(listings)} rental listings"
            }
            print(json.dumps(result))
        else:
            scraper.save_to_json()
            print(f"\nScraped {len(listings)} rental listings")
            print(f"Saved to Supabase and JSON file")
            
    except Exception as e:
        if args.json:
            result = {
                "status": "error",
                "message": str(e)
            }
            print(json.dumps(result))
        else:
            print(f"Error: {e}")
    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())