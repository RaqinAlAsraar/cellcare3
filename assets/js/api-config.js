/**
 * Cell Care India - Master Configuration
 * Headless Google Sheets Product Catalog & Static Company Profile
 */
window.CELLCARE_CONFIG = {
  // Google Sheets -> Google Apps Script headless product catalog
  productsApi: "https://script.google.com/macros/s/AKfycbzPASrJpC5dvoFX-R6zX1AfW-pFyg8DIM6D_p9DG4QSI16qyymFXzibseq1rA9r_f-j2g/exec",

  // Verified official business contact details and social handles embedded statically
  fallback: {
    phone: "+91 85059 10581",
    whatsapp: "918505910581",
    email: "CellCareIndia2025@gmail.com",
    supportEmail: "CellCareIndia2025@gmail.com",
    address: "Shop No. 4, B-32, New Brij Puri, Near Jagatpuri police Station, New Delhi - 110051",
    stats: {
      years_experience: 5,
      batteries_sold: 1000,
      employees: 70,
      distributors: 20
    },
    social: {
      linkedin: "https://www.linkedin.com/in/cell-care-india-931736398",
      facebook: "https://www.facebook.com/profile.php?id=61567162763508&mibextid=ZbWKwL",
      instagram: "https://instagram.com/cellcare_india"
    }
  },

  // Cache configuration for client-side catalog performance
  cacheDurationMs: 10 * 60 * 1000 // 10 minutes client-side product caching
};

// Global aliases for catalog access
window.PRODUCTS_API_URL = window.CELLCARE_CONFIG.productsApi;
window.CATALOG_API_URL = window.CELLCARE_CONFIG.productsApi;
window.CELLCARE_API = {
  products: window.CELLCARE_CONFIG.productsApi,
  catalog: window.CELLCARE_CONFIG.productsApi
};
