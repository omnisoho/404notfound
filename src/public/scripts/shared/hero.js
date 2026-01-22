// Hero Section JavaScript - Parallax, Gallery, and Interactions

// Featured destinations data
const destinations = [
  {
    city: "Tokyo",
    country: "Japan",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop",
    travelers: "2.4k",
  },
  {
    city: "Santorini",
    country: "Greece",
    image:
      "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=800&auto=format&fit=crop",
    travelers: "1.8k",
  },
  {
    city: "Bali",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop",
    travelers: "3.1k",
  },
];

let activeImageIndex = 0;
let mousePosition = { x: 0, y: 0 };
let autoRotateInterval = null;

// Initialize hero effects when DOM is loaded
function initHeroEffects() {
  initMouseParallax();
  initGalleryRotation();
  initPreviewButtons();
  initScrollIndicator();
  initParallaxScroll();
}

// Mouse parallax effect for blobs and cards
function initMouseParallax() {
  document.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    mousePosition = { x, y };

    // Update blob positions
    const blob1 = document.getElementById("blob1");
    const blob2 = document.getElementById("blob2");
    if (blob1) blob1.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    if (blob2) blob2.style.transform = `translate(${x * -15}px, ${y * -15}px)`;

    // Update card positions with 3D tilt
    const cardBg = document.getElementById("cardBg");
    const cardMain = document.getElementById("cardMain");
    if (cardBg)
      cardBg.style.transform = `perspective(1000px) rotateY(${x * -2}deg) rotateX(${y * 2}deg)`;
    if (cardMain)
      cardMain.style.transform = `perspective(1200px) rotateY(${x * -3}deg) rotateX(${y * 3}deg) translateZ(20px)`;
  });
}

// Auto-rotate featured images every 5 seconds
function initGalleryRotation() {
  autoRotateInterval = setInterval(() => {
    activeImageIndex = (activeImageIndex + 1) % destinations.length;
    updateActiveImage();
  }, 5000);
}

// Preview button clicks
function initPreviewButtons() {
  document.querySelectorAll(".preview-btn").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      // Clear auto-rotate when user manually changes image
      if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
      }

      activeImageIndex = index;
      updateActiveImage();

      // Restart auto-rotate after 10 seconds of inactivity
      setTimeout(() => {
        initGalleryRotation();
      }, 10000);
    });
  });
}

// Update active image and metadata
function updateActiveImage() {
  const dest = destinations[activeImageIndex];

  // Update main image with fade effect
  const mainImg = document.getElementById("mainImageElement");
  if (mainImg) {
    mainImg.style.opacity = "0";
    setTimeout(() => {
      mainImg.src = dest.image;
      mainImg.alt = `${dest.city} travel destination`;
      mainImg.style.opacity = "1";
    }, 300);
  }

  // Update text content
  const cityName = document.getElementById("cityName");
  const countryName = document.getElementById("countryName");
  const travelers = document.getElementById("travelers");

  if (cityName) cityName.textContent = dest.city;
  if (countryName) countryName.textContent = dest.country;
  if (travelers) travelers.textContent = dest.travelers;

  // Update active preview button
  document.querySelectorAll(".preview-btn").forEach((btn, index) => {
    btn.classList.toggle("active", index === activeImageIndex);
  });
}

// Scroll indicator functionality
function initScrollIndicator() {
  const scrollIndicator = document.getElementById("scrollIndicator");
  if (!scrollIndicator) return;

  scrollIndicator.addEventListener("click", () => {
    const parallaxSection = document.querySelector(".parallax-section");
    if (parallaxSection) {
      const headerOffset = 80;
      const elementPosition = parallaxSection.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  });
}

// Parallax scroll effect for images
function initParallaxScroll() {
  let ticking = false;

  function updateParallax() {
    const isMobile = window.innerWidth < 1024;

    // Main hero image parallax
    const mainContainer = document.getElementById("mainImageContainer");
    const mainImage = document.getElementById("mainImage");
    if (mainContainer && mainImage && !isMobile) {
      const rect = mainContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const scrolled = viewportHeight - rect.top;
      const scrollRange = viewportHeight + rect.height;
      const scrollProgress = Math.max(0, Math.min(1, scrolled / scrollRange));

      const intensity = 0.8;
      const scale = 1.3;
      const baseMovement = 400;
      const maxMovement = baseMovement * intensity;
      const parallaxOffset = (scrollProgress - 0.5) * maxMovement;

      mainImage.style.transform = `translate3d(0, ${parallaxOffset}px, 0) scale(${scale})`;
    }

    // Kyoto section image parallax
    const kyotoContainer = document.getElementById("kyotoContainer");
    const kyotoImage = document.getElementById("kyotoImage");
    if (kyotoContainer && kyotoImage && !isMobile) {
      const rect = kyotoContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const scrolled = viewportHeight - rect.top;
      const scrollRange = viewportHeight + rect.height;
      const scrollProgress = Math.max(0, Math.min(1, scrolled / scrollRange));

      const intensity = 1.8;
      const scale = 1.5;
      const baseMovement = 400;
      const maxMovement = baseMovement * intensity;
      const parallaxOffset = (scrollProgress - 0.5) * maxMovement;

      kyotoImage.style.transform = `translate3d(0, ${parallaxOffset}px, 0) scale(${scale})`;
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  // Initial parallax calculation
  updateParallax();

  // Add scroll and resize listeners
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateParallax, { passive: true });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroEffects);
} else {
  initHeroEffects();
}

// Export for use in other modules if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initHeroEffects,
    updateActiveImage,
    destinations,
  };
}
