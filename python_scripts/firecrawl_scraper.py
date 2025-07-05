#!/usr/bin/env python3
"""
Firecrawl-based scraper for Facebook rental groups
Uses Firecrawl API to handle JavaScript rendering and extraction
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import re
from dotenv import load_dotenv
from firecrawl import FirecrawlApp
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
    currency: str = "ILS"
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


class FirecrawlRentalScraper:
    """Facebook Group rental scraper using Firecrawl API"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('FIRECRAWL_API_KEY')
        self.logger = self._setup_logger()
        self.listings: List[RentalListing] = []
        
        # Initialize Firecrawl
        if self.api_key:
            self.app = FirecrawlApp(api_key=self.api_key)
        else:
            self.logger.warning("No Firecrawl API key provided")
        
        # Supabase client
        self.supabase: Client = create_client(
            os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        )
        
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
    
    def _extract_price(self, text: str) -> Optional[float]:
        """Extract price from Hebrew/English text"""
        if not text:
            return None
        
        text = text.replace(',', '')
        
        patterns = [
            r'₪\s*(\d+)',
            r'(\d+)\s*₪',
            r'(\d+)\s*ש[״\'״]ח',
            r'(\d+)\s*NIS',
            r'\$\s*(\d+)',
            r'(\d+)\s*\$',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    pass
        
        return None
    
    def _extract_rooms_info(self, text: str) -> tuple[Optional[int], Optional[float]]:
        """Extract room count from Hebrew/English text"""
        bedrooms = None
        bathrooms = None
        
        room_patterns = [
            r'(\d+(?:\.\d+)?)\s*חדרים',
            r'(\d+(?:\.\d+)?)\s*חד[׳\']',
            r'דירת\s*(\d+(?:\.\d+)?)\s*חדרים',
        ]
        
        for pattern in room_patterns:
            match = re.search(pattern, text)
            if match:
                rooms = float(match.group(1))
                if rooms > 1:
                    bedrooms = int(rooms - 1)
                else:
                    bedrooms = 0
                break
        
        if bedrooms is None:
            bed_match = re.search(r'(\d+)\s*(?:bed|bedroom)', text, re.IGNORECASE)
            if bed_match:
                bedrooms = int(bed_match.group(1))
        
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
        
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()[:16]
    
    def _parse_listing_from_content(self, content: Dict, group_id: str, group_name: str) -> Optional[RentalListing]:
        """Parse rental listing from Firecrawl content"""
        try:
            # Extract text content
            text = content.get('content', '') or content.get('markdown', '')
            if not text:
                return None
            
            # Check if it's a rental post
            rental_keywords = ['השכרה', 'להשכרה', 'דירה', 'חדרים', 'for rent', 'apartment', 'flat']
            if not any(keyword in text.lower() for keyword in rental_keywords):
                return None
            
            # Extract URL
            url = content.get('url', '')
            
            # Extract metadata
            metadata = content.get('metadata', {})
            title = metadata.get('title', text[:100])
            
            # Extract images
            image_urls = []
            if 'screenshot' in content:
                image_urls.append(content['screenshot'])
            
            # Look for image URLs in content
            img_pattern = r'https://[^\s"\']+\.(?:jpg|jpeg|png|webp)'
            found_images = re.findall(img_pattern, text)
            image_urls.extend(found_images[:5])  # Limit to 5 images
            
            # Create listing
            listing = RentalListing(
                facebook_id=self._extract_facebook_id(url),
                title=title[:100] + "..." if len(title) > 100 else title,
                listing_url=url,
                scraped_at=datetime.now(),
                group_id=group_id,
                group_name=group_name,
                description=text,
                image_urls=list(set(image_urls)),  # Remove duplicates
            )
            
            # Extract structured data
            listing.price_per_month = self._extract_price(text)
            listing.bedrooms, listing.bathrooms = self._extract_rooms_info(text)
            listing.amenities = self._detect_amenities(text)
            
            # Detect property type
            if 'דירה' in text or 'apartment' in text.lower():
                listing.property_type = 'apartment'
            elif 'בית' in text or 'house' in text.lower():
                listing.property_type = 'house'
            elif 'חדר' in text or 'room' in text.lower():
                listing.property_type = 'room'
            
            return listing
            
        except Exception as e:
            self.logger.error(f"Error parsing listing: {e}")
            return None
    
    async def scrape_facebook_group(self, group_url: str, max_posts: int = 10) -> List[RentalListing]:
        """Scrape rental listings from a Facebook group using Firecrawl"""
        if not self.api_key:
            self.logger.error("Firecrawl API key not configured")
            return []
        
        # Extract group ID
        group_id_match = re.search(r'/groups/(\d+)', group_url)
        if not group_id_match:
            self.logger.error(f"Invalid group URL: {group_url}")
            return []
        
        group_id = group_id_match.group(1)
        group_name = f"Group {group_id}"
        
        try:
            self.logger.info(f"Scraping group with Firecrawl: {group_url}")
            
            # Scrape the page with Firecrawl
            # Use actions to scroll and load more posts
            result = self.app.scrape_url(
                group_url,
                params={
                    'formats': ['markdown', 'screenshot'],
                    'waitFor': 5000,  # Wait for content to load
                    'actions': [
                        {'type': 'scroll', 'direction': 'down', 'amount': 1000},
                        {'type': 'wait', 'milliseconds': 2000},
                        {'type': 'scroll', 'direction': 'down', 'amount': 1000},
                        {'type': 'wait', 'milliseconds': 2000},
                        {'type': 'scroll', 'direction': 'down', 'amount': 1000},
                    ]
                }
            )
            
            if result and 'content' in result:
                # Parse the content to extract individual posts
                content = result['content']
                
                # Split content into posts (this is a simplified approach)
                # In reality, we'd need more sophisticated parsing
                posts = content.split('\n\n')
                
                for i, post_text in enumerate(posts[:max_posts]):
                    if len(post_text) < 50:  # Skip short snippets
                        continue
                    
                    # Create a mock content object for parsing
                    post_content = {
                        'content': post_text,
                        'url': f"{group_url}/posts/{i}",
                        'metadata': {'title': post_text[:50]}
                    }
                    
                    listing = self._parse_listing_from_content(post_content, group_id, group_name)
                    if listing:
                        self.listings.append(listing)
                        await self.save_listing_to_supabase(listing)
                        self.logger.info(f"Scraped listing: {listing.title[:50]}...")
            
            # Alternative: Use crawl to get multiple pages
            # This would be better for getting individual post URLs
            """
            crawl_result = self.app.crawl_url(
                group_url,
                params={
                    'limit': max_posts,
                    'scrapeOptions': {
                        'formats': ['markdown'],
                        'waitFor': 3000,
                    }
                }
            )
            
            if crawl_result and 'data' in crawl_result:
                for page_data in crawl_result['data']:
                    listing = self._parse_listing_from_content(page_data, group_id, group_name)
                    if listing:
                        self.listings.append(listing)
                        await self.save_listing_to_supabase(listing)
            """
            
            self.logger.info(f"Found {len(self.listings)} rental listings")
            
        except Exception as e:
            self.logger.error(f"Error scraping with Firecrawl: {e}")
        
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
                    # Use the UploadThing URL for all images for now
                    uploadthing_url = 'https://py5iwgffjd.ufs.sh/f/ErznS8cNMHlPwNeWJbGFASWOq8cpgZKI6N2mDBoGVLrsvlfC'
                    for idx in range(min(3, len(listing.image_urls))):
                        image_data = {
                            'rental_id': rental_id,
                            'image_url': uploadthing_url,
                            'image_order': idx,
                            'is_primary': idx == 0
                        }
                        self.supabase.table('rental_images').insert(image_data).execute()
                
                # Insert amenities
                if listing.amenities:
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
    
    def save_to_json(self, filename: str = "firecrawl_rentals.json"):
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
    """Main function to run the Firecrawl scraper"""
    import argparse
    import asyncio
    
    parser = argparse.ArgumentParser(description="Firecrawl Facebook Group Rental Scraper")
    parser.add_argument("--group", type=str, help="Facebook group URL to scrape")
    parser.add_argument("--max-posts", type=int, default=10, help="Maximum posts to scrape")
    parser.add_argument("--api-key", type=str, help="Firecrawl API key (or set FIRECRAWL_API_KEY env var)")
    parser.add_argument("--json", action="store_true", help="Output JSON for API")
    
    args = parser.parse_args()
    
    if args.json and not args.group:
        # API status check
        result = {
            "status": "ready",
            "message": "Firecrawl scraper is ready",
            "requires_api_key": not (args.api_key or os.getenv('FIRECRAWL_API_KEY')),
            "note": "Firecrawl handles JavaScript rendering and rate limiting automatically"
        }
        print(json.dumps(result))
        return
    
    if not args.group:
        print("Error: --group URL is required")
        return
    
    scraper = FirecrawlRentalScraper(api_key=args.api_key)
    
    try:
        listings = await scraper.scrape_facebook_group(args.group, args.max_posts)
        
        if args.json:
            result = {
                "status": "success",
                "group_url": args.group,
                "listings_found": len(listings),
                "message": f"Successfully scraped {len(listings)} rental listings with Firecrawl"
            }
            print(json.dumps(result))
        else:
            scraper.save_to_json()
            print(f"\nScraped {len(listings)} rental listings using Firecrawl")
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


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())