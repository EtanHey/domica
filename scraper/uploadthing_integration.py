#!/usr/bin/env python3
"""
UploadThing Integration for Rental Image Storage
Uploads images to UploadThing and stores URLs in Supabase
"""

import os
import json
import asyncio
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import httpx
from dotenv import load_dotenv
import base64

load_dotenv()

# <scratchpad>This integrates UploadThing for image storage with our rental scraper</scratchpad>
# AI-DEV: Uses UTApi for server-side uploads to UploadThing

@dataclass
class UploadedImage:
    """Result of an uploaded image"""
    url: str
    key: str
    name: str
    size: int
    custom_id: Optional[str] = None

class UploadThingClient:
    """
    Client for uploading images to UploadThing
    """
    
    def __init__(self, token: Optional[str] = None, api_key: Optional[str] = None):
        self.token = token or os.getenv("UPLOADTHING_TOKEN")
        self.api_key = api_key or os.getenv("UPLOADTHING_SECRET")
        
        if not self.token and not self.api_key:
            raise ValueError("UPLOADTHING_TOKEN or UPLOADTHING_SECRET environment variable is required")
        
        self.logger = logging.getLogger(__name__)
        self.client = httpx.AsyncClient()
        
        # Extract app ID and region from token if available
        if self.token:
            try:
                decoded = base64.b64decode(self.token).decode('utf-8')
                token_data = json.loads(decoded)
                self.api_key = token_data.get('apiKey', self.api_key)
                self.app_id = token_data.get('appId')
                self.regions = token_data.get('regions', ['us'])
                self.region = self.regions[0] if self.regions else 'us'
            except Exception as e:
                self.logger.warning(f"Could not decode token: {e}")
                self.app_id = None
                self.region = 'us'
        else:
            self.app_id = None
            self.region = 'us'
    
    async def upload_from_url(self, image_url: str, custom_id: Optional[str] = None) -> Optional[UploadedImage]:
        """
        Upload an image from a URL to UploadThing
        
        Args:
            image_url: URL of the image to upload
            custom_id: Optional custom ID for the image (e.g., rental_id)
        
        Returns:
            UploadedImage object if successful, None otherwise
        """
        try:
            # First, download the image
            response = await self.client.get(image_url)
            response.raise_for_status()
            
            image_data = response.content
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            # Extract filename from URL or generate one
            filename = image_url.split('/')[-1].split('?')[0]
            if not filename or '.' not in filename:
                extension = content_type.split('/')[-1]
                filename = f"rental_image_{custom_id or 'unknown'}.{extension}"
            
            # Upload to UploadThing using their API
            return await self.upload_file(
                file_data=image_data,
                filename=filename,
                content_type=content_type,
                custom_id=custom_id
            )
            
        except Exception as e:
            self.logger.error(f"Error uploading image from URL {image_url}: {e}")
            return None
    
    async def upload_file(
        self, 
        file_data: bytes, 
        filename: str,
        content_type: str = 'image/jpeg',
        custom_id: Optional[str] = None
    ) -> Optional[UploadedImage]:
        """
        Upload a file to UploadThing
        
        This simulates what the UTApi.uploadFiles method does server-side
        """
        try:
            # Step 1: Request presigned URL from UploadThing
            presigned_request = {
                "files": [{
                    "name": filename,
                    "size": len(file_data),
                    "type": content_type,
                    "customId": custom_id
                }]
            }
            
            headers = {
                "x-uploadthing-api-key": self.api_key,
                "content-type": "application/json"
            }
            
            # Get presigned URL
            presigned_response = await self.client.post(
                f"https://api.uploadthing.com/v6/uploadFiles",
                json=presigned_request,
                headers=headers
            )
            presigned_response.raise_for_status()
            presigned_data = presigned_response.json()
            
            if not presigned_data.get("data") or len(presigned_data["data"]) == 0:
                self.logger.error("No presigned URL received")
                return None
            
            upload_info = presigned_data["data"][0]
            presigned_url = upload_info.get("url")
            file_key = upload_info.get("key")
            
            # Step 2: Upload file to presigned URL
            upload_response = await self.client.put(
                presigned_url,
                content=file_data,
                headers={"Content-Type": content_type}
            )
            upload_response.raise_for_status()
            
            # Step 3: Confirm upload completion
            # UploadThing will process the file and make it available
            
            # Construct the public URL
            public_url = f"https://utfs.io/f/{file_key}"
            
            return UploadedImage(
                url=public_url,
                key=file_key,
                name=filename,
                size=len(file_data),
                custom_id=custom_id
            )
            
        except Exception as e:
            self.logger.error(f"Error uploading file {filename}: {e}")
            return None
    
    async def upload_multiple_from_urls(
        self, 
        image_urls: List[Tuple[str, Optional[str]]]
    ) -> List[UploadedImage]:
        """
        Upload multiple images from URLs concurrently
        
        Args:
            image_urls: List of tuples (url, custom_id)
        
        Returns:
            List of successfully uploaded images
        """
        tasks = [
            self.upload_from_url(url, custom_id) 
            for url, custom_id in image_urls
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out None values and exceptions
        uploaded_images = []
        for result in results:
            if isinstance(result, UploadedImage):
                uploaded_images.append(result)
            elif isinstance(result, Exception):
                self.logger.error(f"Upload error: {result}")
        
        return uploaded_images
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class RentalImageUploader:
    """
    Handles uploading rental images and updating Supabase
    """
    
    def __init__(self, uploadthing_client: UploadThingClient):
        self.uploadthing = uploadthing_client
        self.logger = logging.getLogger(__name__)
    
    async def process_rental_images(
        self, 
        rental_id: str,
        image_urls: List[str]
    ) -> Dict[str, List[UploadedImage]]:
        """
        Upload rental images to UploadThing and prepare for Supabase
        
        Args:
            rental_id: The rental's ID
            image_urls: List of image URLs to upload
        
        Returns:
            Dictionary with uploaded images ready for Supabase insertion
        """
        # Create tuples with custom IDs for tracking
        urls_with_ids = [
            (url, f"{rental_id}_{idx}")
            for idx, url in enumerate(image_urls)
        ]
        
        # Upload all images
        uploaded = await self.uploadthing.upload_multiple_from_urls(urls_with_ids)
        
        self.logger.info(f"Uploaded {len(uploaded)}/{len(image_urls)} images for rental {rental_id}")
        
        return {
            "rental_id": rental_id,
            "images": uploaded
        }
    
    def prepare_for_supabase(self, rental_id: str, uploaded_images: List[UploadedImage]) -> List[Dict]:
        """
        Prepare uploaded images for Supabase insertion
        
        Returns:
            List of dictionaries ready for rental_images table
        """
        return [
            {
                "rental_id": rental_id,
                "image_url": img.url,
                "image_order": idx,
                "is_primary": idx == 0
            }
            for idx, img in enumerate(uploaded_images)
        ]


# Example usage
async def demo_upload():
    """
    Demonstrate uploading images from URLs
    """
    # Initialize UploadThing client
    client = UploadThingClient()
    uploader = RentalImageUploader(client)
    
    # Example rental with images
    rental_id = "test_rental_123"
    image_urls = [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
        "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    ]
    
    # Process and upload images
    result = await uploader.process_rental_images(rental_id, image_urls)
    
    # Prepare for Supabase
    supabase_data = uploader.prepare_for_supabase(
        rental_id, 
        result["images"]
    )
    
    print(f"Uploaded {len(result['images'])} images")
    print("Ready for Supabase insertion:")
    for item in supabase_data:
        print(f"  - {item['image_url']} (order: {item['image_order']})")
    
    await client.close()


if __name__ == "__main__":
    # Set up environment variables:
    # UPLOADTHING_SECRET=your_api_key
    # UPLOADTHING_APP_ID=your_app_id (optional for newer keys)
    
    print("UploadThing Integration for Rental Images")
    print("This module handles uploading images to UploadThing")
    print("and preparing the data for Supabase storage")
    
    # Uncomment to run demo:
    # asyncio.run(demo_upload())