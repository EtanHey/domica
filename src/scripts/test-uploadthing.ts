import { utapi } from "@/server/uploadthing";
import { UTFile } from "uploadthing/server";

// AI-DEV: Test script for UploadThing integration
// Run with: npx tsx src/scripts/test-uploadthing.ts

async function testUploadFromUrl() {
  console.log("Testing UploadThing integration...");

  try {
    // Test URLs (using working Unsplash images)
    const testUrls = [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    ];

    // Upload from URLs
    console.log("Uploading images from URLs...");
    const uploadResults = await utapi.uploadFilesFromUrl(testUrls);
    
    console.log("Upload results:");
    uploadResults.forEach((result, index) => {
      if (result.data) {
        console.log(`✓ Image ${index + 1}: ${result.data.url}`);
        console.log(`  Key: ${result.data.key}`);
        console.log(`  Name: ${result.data.name}`);
        console.log(`  Size: ${result.data.size} bytes`);
      } else {
        console.log(`✗ Image ${index + 1} failed:`, result.error);
      }
    });

    // Test file upload
    console.log("\nTesting direct file upload...");
    const testFile = new UTFile(
      ["Test rental image content"],
      "test-rental.txt",
      { customId: "rental_test_123" }
    );

    const fileResult = await utapi.uploadFiles([testFile]);
    console.log("File upload result:", fileResult);

  } catch (error) {
    console.error("Error during upload test:", error);
  }
}

// Run the test
testUploadFromUrl()
  .then(() => {
    console.log("\nTest completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });