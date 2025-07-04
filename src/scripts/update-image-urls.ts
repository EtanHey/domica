import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateImageUrls() {
  console.log("Updating image URLs to working Unsplash images...");

  // First, get all current images to see what needs updating
  const { data: currentImages } = await supabase
    .from("rental_images")
    .select("image_url")
    .limit(100);

  console.log("Current unique image URLs:");
  const uniqueUrls = [...new Set(currentImages?.map(img => img.image_url) || [])];
  uniqueUrls.forEach(url => console.log(`- ${url}`));

  // Map ALL problematic URLs to working ones
  const urlMappings = [
    {
      old: "https://images.unsplash.com/photo-1502672260-714a4d77ecc1?w=800&q=80",
      new: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    },
    {
      old: "https://images.unsplash.com/photo-1502672260-714a4d77ecc2?w=800&q=80",
      new: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80"
    },
    {
      old: "https://images.unsplash.com/photo-1502672260-714a4d77ecc3?w=800&q=80",
      new: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    },
    {
      old: "https://images.unsplash.com/photo-1560448204-e520f4ac569e?w=800&q=80",
      new: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80"
    },
    {
      old: "https://images.unsplash.com/photo-1493809842407-9fe360bb6048?w=800&q=80",
      new: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    }
  ];

  for (const mapping of urlMappings) {
    const { error } = await supabase
      .from("rental_images")
      .update({ image_url: mapping.new })
      .eq("image_url", mapping.old);

    if (error) {
      console.error(`Error updating ${mapping.old}:`, error);
    } else {
      console.log(`Updated: ${mapping.old} -> ${mapping.new}`);
    }
  }

  // Fetch and display updated images
  const { data: images, error: fetchError } = await supabase
    .from("rental_images")
    .select("*")
    .limit(10);

  if (fetchError) {
    console.error("Error fetching images:", fetchError);
  } else {
    console.log("\nCurrent images in database:");
    images?.forEach(img => {
      console.log(`- ${img.image_url} (primary: ${img.is_primary})`);
    });
  }
}

updateImageUrls()
  .then(() => {
    console.log("\nImage URL update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update image URLs:", error);
    process.exit(1);
  });