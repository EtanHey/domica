import { utapi } from "@/server/uploadthing";
import fs from "fs/promises";
import path from "path";

// AI-DEV: Script to test uploading Unsplash images from test-images.json
// Run with: npx tsx src/scripts/test-upload-unsplash.ts

// Convert Unsplash photo page URLs to direct image URLs
function convertUnsplashUrl(photoUrl: string): string {
  // Extract photo ID from URL
  const match = photoUrl.match(/photos\/([^\/]+?)(?:-([a-zA-Z0-9_-]+))?$/);
  if (!match) {
    throw new Error(`Invalid Unsplash URL: ${photoUrl}`);
  }
  
  const photoId = match[2] || match[1]; // Use the ID part after the slug if available
  return `https://images.unsplash.com/photo-${photoId}?w=800&q=80`;
}

async function uploadTestImages() {
  console.log("Reading test images from test-images.json...");
  
  try {
    // Read test-images.json
    const testImagesPath = path.join(process.cwd(), "rental-viz", "test-images.json");
    const testImagesContent = await fs.readFile(testImagesPath, "utf-8");
    const testData = JSON.parse(testImagesContent);
    
    // Convert Unsplash URLs to direct image URLs
    const imageUrls = testData.images.map((img: any) => {
      try {
        const directUrl = convertUnsplashUrl(img.url);
        console.log(`Converting: ${img.name}`);
        console.log(`  From: ${img.url}`);
        console.log(`  To: ${directUrl}`);
        return {
          url: directUrl,
          customId: img.name,
          description: img.description
        };
      } catch (error) {
        console.error(`Failed to convert URL for ${img.name}:`, error);
        return null;
      }
    }).filter(Boolean);
    
    if (imageUrls.length === 0) {
      console.error("No valid URLs to upload");
      return;
    }
    
    // Upload images to UploadThing
    console.log(`\nUploading ${imageUrls.length} images to UploadThing...`);
    
    const uploadResults = await utapi.uploadFilesFromUrl(
      imageUrls.map(img => ({
        url: img.url,
        customId: img.customId
      }))
    );
    
    // Process results
    console.log("\nUpload Results:");
    console.log("================");
    
    const successfulUploads: any[] = [];
    
    uploadResults.forEach((result, index) => {
      const imgInfo = imageUrls[index];
      if (result.data) {
        console.log(`✓ ${imgInfo.customId}: ${imgInfo.description}`);
        console.log(`  UploadThing URL: ${result.data.url}`);
        console.log(`  Key: ${result.data.key}`);
        console.log(`  Size: ${(result.data.size / 1024).toFixed(2)} KB`);
        
        successfulUploads.push({
          name: imgInfo.customId,
          description: imgInfo.description,
          originalUrl: testData.images[index].url,
          uploadthingUrl: result.data.url,
          key: result.data.key,
          size: result.data.size
        });
      } else {
        console.log(`✗ ${imgInfo.customId} failed:`, result.error);
      }
    });
    
    // Save results to file
    if (successfulUploads.length > 0) {
      const resultsPath = path.join(process.cwd(), "rental-viz", "uploaded-images.json");
      await fs.writeFile(
        resultsPath,
        JSON.stringify({ 
          uploadedAt: new Date().toISOString(),
          images: successfulUploads 
        }, null, 2)
      );
      console.log(`\nResults saved to: ${resultsPath}`);
    }
    
    console.log(`\nSuccessfully uploaded ${successfulUploads.length}/${imageUrls.length} images`);
    
  } catch (error) {
    console.error("Error during upload test:", error);
  }
}

// Run the test
uploadTestImages()
  .then(() => {
    console.log("\nTest completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });