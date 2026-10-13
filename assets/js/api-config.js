/**
 * Cell Care India - Master API Configuration
 * Supports Artifyscreens PythonAnywhere backend, Google Apps Script Product Catalog,
 * and conversational WhatsApp commerce.
 */
window.CELLCARE_CONFIG = {
  // PythonAnywhere REST backend for products, categories, site config, contact inquiries, and stats
  siteApi: "https://artifyscreens.pythonanywhere.com",
  artifyProductsApi: "https://artifyscreens.pythonanywhere.com/api/products/",
  artifyCategoriesApi: "https://artifyscreens.pythonanywhere.com/api/categories/",

  // Google Sheets -> Google Apps Script headless product catalog
  productsApi: "https://script.google.com/macros/s/AKfycbzPASrJpC5dvoFX-R6zX1AfW-pFyg8DIM6D_p9DG4QSI16qyymFXzibseq1rA9r_f-j2g/exec",

  // Verified official business contact details from PythonAnywhere backend
  fallback: {
    phone: "+91 85059 10581",
    whatsapp: "918505910581",
    email: "CellCareIndia2025@gmail.com",
    supportEmail: "CellCareIndia2025@gmail.com",
    address: "Shop No. 4, B-32, New Brij Puri, Near Jagatpuri police Station, New Delhi - 110051",
    social: {
      facebook: "",
      twitter: "",
      instagram: "https://instagram.com/cellcare_india",
      linkedin: ""
    }
  },

  // Cache configuration for fast static performance
  cacheDurationMs: 10 * 60 * 1000 // 10 minutes client-side product caching
};

// Global aliases for backward compatibility with cellcare2 logic
window.API_BASE = window.CELLCARE_CONFIG.siteApi;
window.SITE_API_URL = window.CELLCARE_CONFIG.siteApi;
window.PRODUCTS_API_URL = window.CELLCARE_CONFIG.artifyProductsApi;
window.CATALOG_API_URL = window.CELLCARE_CONFIG.productsApi;
window.CELLCARE_API = {
  site: window.CELLCARE_CONFIG.siteApi,
  products: window.CELLCARE_CONFIG.artifyProductsApi,
  catalog: window.CELLCARE_CONFIG.productsApi
};
