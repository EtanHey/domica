import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Using placeholder images since Unsplash URLs are problematic
const workingImageUrls = [
  "https://placehold.co/800x600/708090/FFFFFF?text=Living+Room", 
  "https://placehold.co/800x600/8B7355/FFFFFF?text=Bedroom",
  "https://placehold.co/800x600/5F8A8B/FFFFFF?text=Kitchen",
  "https://placehold.co/800x600/A0522D/FFFFFF?text=Bathroom",
  "https://placehold.co/800x600/696969/FFFFFF?text=Building+Exterior",
  "https://placehold.co/800x600/8B4513/FFFFFF?text=Interior+View",
  "https://placehold.co/800x600/2F4F4F/FFFFFF?text=Amenities",
  "https://placehold.co/800x600/556B2F/FFFFFF?text=Rental+Property",
];

async function fixAllImages() {
  console.log("Fetching all rental images...");
  
  // Get all images
  const { data: images, error } = await supabase
    .from("rental_images")
    .select("*")
    .order("rental_id", { ascending: true });

  if (error) {
    console.error("Error fetching images:", error);
    return;
  }

  console.log(`Found ${images?.length || 0} images`);

  // Group by rental_id
  const imagesByRental = images?.reduce((acc, img) => {
    if (!acc[img.rental_id]) acc[img.rental_id] = [];
    acc[img.rental_id].push(img);
    return acc;
  }, {} as Record<string, any[]>);

  // Update each rental's images
  let updateCount = 0;
  for (const [rentalId, rentalImages] of Object.entries(imagesByRental || {})) {
    console.log(`\nUpdating images for rental ${rentalId}...`);
    
    for (let i = 0; i < rentalImages.length; i++) {
      const image = rentalImages[i];
      const newUrl = workingImageUrls[i % workingImageUrls.length];
      
      const { error: updateError } = await supabase
        .from("rental_images")
        .update({ image_url: newUrl })
        .eq("id", image.id);

      if (updateError) {
        console.error(`Error updating image ${image.id}:`, updateError);
      } else {
        console.log(`✓ Updated image ${i + 1}: ${newUrl}`);
        updateCount++;
      }
    }
  }

  console.log(`\n✅ Successfully updated ${updateCount} images`);

  // Verify the updates
  console.log("\nVerifying updates...");
  const { data: updatedImages } = await supabase
    .from("rental_images")
    .select("rental_id, image_url, is_primary")
    .order("rental_id", { ascending: true })
    .limit(20);

  console.log("\nSample of updated images:");
  updatedImages?.forEach(img => {
    console.log(`- Rental ${img.rental_id}: ${img.image_url} (primary: ${img.is_primary})`);
  });
}

fixAllImages()
  .then(() => {
    console.log("\n✅ Image fix completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to fix images:", error);
    process.exit(1);
  });