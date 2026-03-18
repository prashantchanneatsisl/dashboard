// Vessel images configuration
// Add your vessel image paths here
// Place images in client/public/images/ folder

// To add custom images, simply add them to this array
// The images will be automatically loaded and displayed in the Vessel Photos carousel

export const vesselImages = [
  { id: 1, src: "/images/Babylon.png", title: "Babylon", vessel: "Babylon" },
  { id: 2, src: "/images/Blossom.png", title: "Blossom", vessel: "Blossom" },
  { id: 3, src: "/images/Capital.png", title: "Capital", vessel: "Capital" },
  { id: 4, src: "/images/Concord.png", title: "Concord", vessel: "Concord" },
  { id: 5, src: "/images/Coronet.png", title: "Coronet", vessel: "Coronet" },
  { id: 6, src: "/images/Courage.png", title: "Courage", vessel: "Courage" },
  { id: 7, src: "/images/Dynasty.png", title: "Dynasty", vessel: "Dynasty" },
  { id: 8, src: "/images/Harvest.png", title: "Harvest", vessel: "Harvest" },
  { id: 9, src: "/images/Kestrel.png", title: "Kestrel", vessel: "Kestrel" },
  { id: 10, src: "/images/Lourdes.png", title: "Lourdes", vessel: "Lourdes" },
  { id: 11, src: "/images/Loyalty.png", title: "Loyalty", vessel: "Loyalty" },
  { id: 12, src: "/images/Patriot.png", title: "Patriot", vessel: "Patriot" },
  { id: 13, src: "/images/Pioneer.png", title: "Pioneer", vessel: "Pioneer" },
  { id: 14, src: "/images/Regency.png", title: "Regency", vessel: "Regency" },
  { id: 15, src: "/images/Sparkle.png", title: "Sparkle", vessel: "Sparkle" },
  { id: 16, src: "/images/Success.png", title: "Success", vessel: "Success" },
];

// Function to load images from the public/images folder
export const loadImagesFromFolder = async () => {
  try {
    // Try to fetch image list from server
    const response = await fetch('/api/vessel-images');
    if (response.ok) {
      const images = await response.json();
      if (images.length > 0) {
        return images;
      }
    }
  } catch (error) {
    console.log('Using default vessel images');
  }
  
  // Return default images if no custom images found
  return vesselImages;
};
