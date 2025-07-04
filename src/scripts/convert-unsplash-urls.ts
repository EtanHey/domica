// Convert Unsplash photo page URLs to direct image URLs

const photoPageUrls = [
  "https://unsplash.com/photos/gray-fabric-loveseat-near-brown-wooden-table-3wylDrjxH-E",
  "https://unsplash.com/photos/tidy-room-filled-with-furnitures-gREquCUXQLI",
  "https://unsplash.com/photos/brown-wooden-bed-frame-with-white-cover-beside-brown-wooden-nightstand-FqqiAvJejto",
  "https://unsplash.com/photos/brown-wooden-table-and-chair-beside-bookshelf-iRiVzALa4pI",
  "https://unsplash.com/photos/low-angle-photo-of-high-rise-apartment-building-5q1KnUjtjaM",
  "https://unsplash.com/photos/white-wooden-dresser-with-mirror-7pCFUybP_P8",
  "https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-large-window-OtXADkUh3-I",
  "https://unsplash.com/photos/black-and-white-cocnrete-building-low-angle-photography-koH7IVuwRLw",
  "https://unsplash.com/photos/flat-screen-monitor-inside-room-jn7uVeCdf6U"
];

function extractPhotoId(url: string): string {
  // Extract the photo ID (last part after the last hyphen)
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  const idMatch = lastPart.match(/-([a-zA-Z0-9_-]+)$/);
  return idMatch ? idMatch[1] : lastPart;
}

console.log("Converting Unsplash URLs:\n");

const directUrls = photoPageUrls.map(url => {
  const photoId = extractPhotoId(url);
  const directUrl = `https://images.unsplash.com/photo-${photoId}?w=800&q=80`;
  console.log(`Photo ID: ${photoId}`);
  console.log(`Direct URL: ${directUrl}\n`);
  return directUrl;
});

console.log("\nAll direct URLs for copying:");
directUrls.forEach(url => console.log(url));