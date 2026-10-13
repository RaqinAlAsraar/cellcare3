/**
 * CELL CARE INDIA — DEDICATED PRODUCT DETAIL ENGINE (v3.0)
 * Dynamic rendering, SEO schema injection, gallery zoom, specs table,
 * and WhatsApp quotation dispatcher.
 */

(function () {
  "use strict";

  const CACHE_KEY = "cellcare_catalog_cache_v3";
  let currentProduct = null;

  // ----------------------------------------------------
  // 1. DATASET & CACHE
  // ----------------------------------------------------

  // ----------------------------------------------------
  // 1. DETAIL SKELETON PRE-LOADER & LIVE ENGINE
  // ----------------------------------------------------
  function renderDetailSkeleton() {
    const titleEl = document.getElementById("detailTitle");
    const priceEl = document.getElementById("detailPrice");
    const descEl = document.getElementById("detailDesc");
    const catTag = document.getElementById("detailCategoryTag");
    const relatedGrid = document.getElementById("detailRelatedGrid");
    const mainImg = document.getElementById("detailMainImg");

    if (titleEl) {
      titleEl.innerHTML = `<div class="skeleton-title-bar skeleton-shimmer" style="height:32px; width:75%; margin-bottom:12px;"></div>`;
    }
    if (priceEl) {
      priceEl.innerHTML = `<div class="skeleton-price-bar skeleton-shimmer" style="height:34px; width:45%;"></div>`;
    }
    if (descEl) {
      descEl.innerHTML = `
        <div class="skeleton-desc-bar skeleton-shimmer" style="margin-bottom:8px;"></div>
        <div class="skeleton-desc-bar skeleton-shimmer" style="margin-bottom:8px;"></div>
        <div class="skeleton-desc-bar short skeleton-shimmer"></div>
      `;
    }
    if (catTag) {
      catTag.innerHTML = `<div class="skeleton-pill skeleton-shimmer" style="display:inline-block; width:90px; height:18px;"></div>`;
    }
    if (mainImg) {
      mainImg.classList.add("skeleton-shimmer");
    }

    if (relatedGrid) {
      relatedGrid.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-media skeleton-shimmer"></div>
          <div class="skeleton-content">
            <div class="skeleton-pill skeleton-shimmer"></div>
            <div class="skeleton-title-bar skeleton-shimmer"></div>
            <div class="skeleton-price-bar skeleton-shimmer"></div>
            <div class="skeleton-actions-row">
              <div class="skeleton-btn-bar skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  function clearDetailSkeleton() {
    const mainImg = document.getElementById("detailMainImg");
    if (mainImg) {
      mainImg.classList.remove("skeleton-shimmer");
    }
  }

  async function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const target = (params.get("id") || params.get("slug") || "").trim();

    // 1. Immediately activate cyber skeleton pre-loader
    renderDetailSkeleton();
    if (window.startPreloader) window.startPreloader();

    let allProducts = [];

    // 2. Check if already present in session cache
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.items) && parsed.items.length) {
          allProducts = parsed.items;
        }
      }
    } catch (e) {}

    let found = null;
    if (target && allProducts.length > 0) {
      found = allProducts.find(p => 
        (p.slug && p.slug.toLowerCase() === target.toLowerCase()) ||
        String(p.id).toLowerCase() === target.toLowerCase() ||
        (p.title && p.title.toLowerCase().includes(target.toLowerCase()))
      );
      if (found) {
        currentProduct = found;
        clearDetailSkeleton();
        renderProductDetails(found);
        loadRelatedProducts(allProducts, found);
      }
    }

    // 3. Concurrently fetch fresh product details directly from backend APIs
    try {
      if (target) {
        const directRes = await fetch("https://artifyscreens.pythonanywhere.com/api/products/" + encodeURIComponent(target) + "/").catch(() => null);
        if (directRes && directRes.ok) {
          const directItem = await directRes.json();
          if (directItem && directItem.title) {
            currentProduct = directItem;
            clearDetailSkeleton();
            renderProductDetails(directItem);
            fetchRelatedLiveCatalog(directItem);
            return;
          }
        }
      }

      // Fetch master catalog to resolve product & related items
      const artifyUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.artifyProductsApi) || "https://artifyscreens.pythonanywhere.com/api/products/";
      const gsheetUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.productsApi) || "https://script.google.com/macros/s/AKfycbzPASrJpC5dvoFX-R6zX1AfW-pFyg8DIM6D_p9DG4QSI16qyymFXzibseq1rA9r_f-j2g/exec";

      const [artifyRes, gsheetRes] = await Promise.all([
        fetch(`${artifyUrl}?page=1&page_size=100`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${gsheetUrl}?page=1&page_size=100`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const mergedMap = new Map();
      if (artifyRes && Array.isArray(artifyRes.items)) {
        artifyRes.items.forEach(p => {
          if (!p.title) return;
          const k = (p.slug || p.title || String(p.id)).toLowerCase();
          mergedMap.set(k, {
            id: String(p.id),
            slug: p.slug || "",
            title: p.title,
            price: Number(p.price) || 0,
            category: p.category || "General",
            image_url: p.image_url || "assets/images/hero.svg",
            description: p.description || p.mini_desc || (p.title + " - Supplied by Cell Care India."),
            available: p.available !== false && p.in_stock !== false,
            min_quantity: Number(p.min_quantity) || 1
          });
        });
      }
      if (gsheetRes) {
        const gItems = gsheetRes.items || gsheetRes.results || [];
        gItems.forEach(p => {
          if (!p.title) return;
          const k = (p.title || String(p.id)).toLowerCase();
          if (!mergedMap.has(k)) {
            mergedMap.set(k, {
              id: String(p.id || p.sku || k),
              slug: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              title: p.title,
              price: Number(p.price) || 0,
              category: p.category || "General",
              image_url: p.image_url || "assets/images/hero.svg",
              description: p.description || (p.title + " - Supplied by Cell Care India."),
              available: p.available !== false,
              min_quantity: Number(p.min_quantity || p.moq) || 1
            });
          }
        });
      }

      allProducts = Array.from(mergedMap.values());
      if (allProducts.length) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: allProducts })); } catch (e) {}

        if (target) {
          found = allProducts.find(p =>
            (p.slug && p.slug.toLowerCase() === target.toLowerCase()) ||
            String(p.id).toLowerCase() === target.toLowerCase() ||
            (p.title && p.title.toLowerCase().includes(target.toLowerCase()))
          );
        }

        if (found) {
          currentProduct = found;
          clearDetailSkeleton();
          renderProductDetails(found);
          loadRelatedProducts(allProducts, found);
        } else if (allProducts[0]) {
          currentProduct = allProducts[0];
          clearDetailSkeleton();
          renderProductDetails(currentProduct);
          loadRelatedProducts(allProducts, currentProduct);
        }
      }
    } catch (err) {
      console.debug("Live detail fetch note:", err);
    } finally {
      if (window.finishPreloader) window.finishPreloader();
    }
  }

  async function fetchRelatedLiveCatalog(current) {
    try {
      const artifyUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.artifyProductsApi) || "https://artifyscreens.pythonanywhere.com/api/products/";
      const res = await fetch(`${artifyUrl}?page=1&page_size=50`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (items.length) {
          loadRelatedProducts(items, current);
        }
      }
    } catch (e) {}
  }


  // ----------------------------------------------------
  // 2. RENDER DETAILS & INJECT DYNAMIC SEO
  // ----------------------------------------------------
  function renderProductDetails(p) {
    const title = p.title || "Industrial Battery Unit";
    const category = p.category || "Lithium-Ion";
    const desc = p.description || "High-performance Grade-A battery pack engineered with active BMS safety protection.";
    const priceNum = Number(p.price) || 0;
    const formattedPrice = priceNum ? `₹${priceNum.toLocaleString("en-IN")}` : "Contact for B2B Pricing";
    const minQty = parseInt(p.min_quantity || p.moq || 1, 10);
    const imgUrl = p.image_url || "assets/images/hero.svg";
    const isAvailable = p.available !== false;

    // 1. Update Document Title & SEO Meta Tags
    document.title = `${title} | Cell Care India Manufacturer`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `Buy or request B2B wholesale quotation for ${title}. ${desc.substring(0, 140)}... High-efficiency Grade-A cells by Cell Care India.`;
    }

    // 2. Inject Dynamic Schema.org JSON-LD for Search Engines
    injectProductSchema(p);

    // 3. Update Breadcrumb
    const breadcrumbTitle = document.getElementById("breadcrumbProductTitle");
    if (breadcrumbTitle) breadcrumbTitle.textContent = title;

    // 4. Update Images & Badges
    const mainImg = document.getElementById("detailMainImg");
    if (mainImg) {
      mainImg.src = imgUrl;
      mainImg.alt = title;
    }

    const badgeStock = document.getElementById("detailStockBadge");
    if (badgeStock) {
      badgeStock.className = `badge ${isAvailable ? "badge-success" : "badge-danger"}`;
      badgeStock.innerHTML = `<i class="fa-solid ${isAvailable ? "fa-check" : "fa-clock"}"></i> ${isAvailable ? "In Stock & Ready to Dispatch" : "Pre-Order Lead Time"}`;
    }

    const badgeCategory = document.getElementById("detailCategoryBadge");
    if (badgeCategory) {
      badgeCategory.textContent = category;
    }

    // 5. Update Information Panel
    const catTag = document.getElementById("detailCategoryTag");
    if (catTag) catTag.textContent = category;
    const titleEl = document.getElementById("detailTitle");
    if (titleEl) titleEl.textContent = title;
    const skuEl = document.getElementById("detailSku");
    if (skuEl) skuEl.textContent = `SKU: CC-${p.id || "IND-01"}`;
    const priceEl = document.getElementById("detailPrice");
    if (priceEl) priceEl.textContent = formattedPrice;
    const descEl = document.getElementById("detailDesc");
    if (descEl) descEl.textContent = desc;
    const moqEl = document.getElementById("detailMoqNumber");
    if (moqEl) moqEl.textContent = `${minQty} Units`;

    // 6. Stepper Setup
    const stepperInput = document.getElementById("detailQtyInput");
    const subtotalText = document.getElementById("detailSubtotalText");
    const minusBtn = document.getElementById("detailQtyMinus");
    const plusBtn = document.getElementById("detailQtyPlus");

    if (stepperInput) {
      stepperInput.value = minQty;

      const updateSubtotal = () => {
        const qty = parseInt(stepperInput.value, 10) || minQty;
        if (priceNum > 0 && subtotalText) {
          subtotalText.innerHTML = `Estimated Subtotal: <strong>₹${(qty * priceNum).toLocaleString("en-IN")}</strong> (Excl. Freight)`;
        } else if (subtotalText) {
          subtotalText.innerHTML = `Order Quantity: <strong>${qty} Units</strong>`;
        }
      };

      updateSubtotal();

      if (plusBtn) {
        plusBtn.onclick = () => {
          let cur = parseInt(stepperInput.value, 10) || minQty;
          stepperInput.value = cur + minQty;
          updateSubtotal();
        };
      }

      if (minusBtn) {
        minusBtn.onclick = () => {
          let cur = parseInt(stepperInput.value, 10) || minQty;
          if (cur > minQty) {
            stepperInput.value = cur - minQty;
            updateSubtotal();
          }
        };
      }
    }

    // 7. Hook Action Buttons
    const addQuoteBtn = document.getElementById("detailAddQuoteBtn");
    if (addQuoteBtn) {
      addQuoteBtn.onclick = () => {
        const qty = parseInt(stepperInput.value, 10) || minQty;
        if (window.CellCare) {
          window.CellCare.addToCart(p, qty);
        }
      };
    }

    const waQuoteBtn = document.getElementById("detailWaQuoteBtn");
    if (waQuoteBtn) {
      waQuoteBtn.onclick = () => {
        const qty = parseInt(stepperInput.value, 10) || minQty;
        const msg = `Hello Cell Care India! I would like to inquire about:\n\n• Product: *${title}*\n• SKU: *CC-${p.id || "IND"}*\n• Required Quantity: *${qty} Units*\n• Listed Price: *${formattedPrice}*\n\nPlease share availability, bulk discount tiers, and delivery schedule.`;
        if (window.CellCare && typeof window.CellCare.openWhatsApp === "function") {
          window.CellCare.openWhatsApp(msg);
        } else {
          const url = `https://wa.me/918505910581?text=${encodeURIComponent(msg)}`;
          window.location.href = url;
        }
      };
    }

    // 8. Generate Specifications Table
    populateSpecificationsTable(p);
  }

  // ----------------------------------------------------
  // 3. SPECIFICATIONS MATRIX GENERATOR
  // ----------------------------------------------------
  function populateSpecificationsTable(p) {
    const tableBody = document.getElementById("detailSpecsTableBody");
    if (!tableBody) return;

    const specs = [
      { label: "Product Title", value: p.title || "Industrial EV Component" },
      { label: "Product Category", value: p.category || "EV & Battery Component" },
      { label: "Part Reference / SKU", value: `CC-${p.slug || p.sku || p.id || "IND-01"}` },
      { label: "Stock Availability", value: p.available !== false ? "Verified In-Stock (Pan-India Dispatch)" : "Available on Advance Order" },
      { label: "Minimum Order Quantity (MOQ)", value: `${p.min_quantity || 1} Unit(s)` },
      { label: "Quality Grading", value: "100% Verified Grade-A Industrial Quality" },
      { label: "Inspection & Testing", value: "Impedance, Voltage & Continuity Bench Tested Prior to Dispatch" },
      { label: "Packaging Standards", value: "Anti-Static Protective Cushioning & Heavy-Duty Crating" },
      { label: "Commercial Warranty", value: "Direct Manufacturer Replacement & Technical Support Backed" }
    ];

    if (p.voltage) specs.splice(2, 0, { label: "Operating Voltage", value: p.voltage });
    if (p.capacity) specs.splice(3, 0, { label: "Rated Capacity", value: p.capacity });
    if (p.chemistry) specs.splice(4, 0, { label: "Cell Chemistry", value: p.chemistry });

    tableBody.innerHTML = specs.map(s => `
      <tr>
        <th style="width:38%;">${escapeHtml(s.label)}</th>
        <td>${escapeHtml(s.value)}</td>
      </tr>
    `).join("");
  }

  // ----------------------------------------------------
  // 4. SCHEMA.ORG DYNAMIC PRODUCT INJECTION (SEO)
  // ----------------------------------------------------
  function injectProductSchema(p) {
    const priceNum = Number(p.price) || 0;
    const schemaData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": p.title,
      "image": [
        window.location.origin + "/" + (p.image_url || "assets/images/hero.svg")
      ],
      "description": p.description || "Grade-A Lithium and EV battery pack by Cell Care India.",
      "sku": `CC-${p.id || "IND-01"}`,
      "mpn": `MPN-CC-${p.id || "01"}`,
      "brand": {
        "@type": "Brand",
        "name": "Cell Care India"
      },
      "manufacturer": {
        "@type": "Organization",
        "name": "Cell Care India"
      },
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": "INR",
        "price": priceNum > 0 ? priceNum : 5000,
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": p.available !== false ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        "seller": {
          "@type": "Organization",
          "name": "Cell Care India"
        }
      }
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "dynamicProductJsonLd";
    script.textContent = JSON.stringify(schemaData);
    if (document.head) {
      document.head.appendChild(script);
    }
  }

  // ----------------------------------------------------
  // 5. RELATED PRODUCTS CAROUSEL
  // ----------------------------------------------------
  function loadRelatedProducts(allProducts, current) {
    const container = document.getElementById("detailRelatedGrid");
    if (!container) return;

    const others = (allProducts || []).filter(p => 
      String(p.id) !== String(current.id) && 
      (!p.slug || !current.slug || p.slug !== current.slug)
    );

    if (!others.length) {
      const sec = document.getElementById("detailRelatedSection");
      if (sec) sec.style.display = "none";
      return;
    }

    let related = others.filter(p => p.category && current.category && String(p.category).toLowerCase() === String(current.category).toLowerCase());
    if (related.length < 4) {
      const remaining = others.filter(p => !related.includes(p));
      related = related.concat(remaining.slice(0, 4 - related.length));
    }
    related = related.slice(0, 4);

    container.innerHTML = "";

    related.forEach(p => {
      const priceNum = Number(p.price) || 0;
      const formattedPrice = priceNum ? "₹" + priceNum.toLocaleString("en-IN") : "Contact for Price";
      const imgUrl = p.image_url || "assets/images/hero.svg";
      const targetParam = p.slug || p.id;
      const detailUrl = "product.html?id=" + encodeURIComponent(targetParam);

      const card = document.createElement("article");
      card.className = "product-card";
      card.style.cursor = "pointer";
      card.style.boxShadow = "var(--shadow-sm)";

      card.innerHTML = `
        <div class="product-card-media" style="aspect-ratio: 4/3;">
          <img src="${imgUrl}" class="product-card-img" alt="${escapeHtml(p.title)}" loading="lazy" />
        </div>
        <div class="product-card-content">
          <span class="product-card-category">${escapeHtml(p.category || "Components")}</span>
          <h4 class="product-card-title" style="font-size: 1rem; height: auto;">
            <a href="${detailUrl}">${escapeHtml(p.title)}</a>
          </h4>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-primary); margin: 8px 0 14px 0;">
            ${formattedPrice}
          </div>
          <a href="${detailUrl}" class="btn btn-secondary btn-sm" style="width: 100%;">
            ${(window.CellCare && window.CellCare.svg && window.CellCare.svg.info) || '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'} View Specs
          </a>
        </div>
      `;

      card.addEventListener("click", () => {
        window.location.href = detailUrl;
      });

      const btnLink = card.querySelector("a.btn");
      if (btnLink) {
        btnLink.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      container.appendChild(card);
    });
  }

  // ----------------------------------------------------
  // 6. TABS LOGIC
  // ----------------------------------------------------
  function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove("active"));
        tabPanes.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add("active");
      });
    });
  }

  function showErrorState(title, msg) {
    const layout = document.querySelector(".product-detail-layout");
    if (layout) {
      layout.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-battery-empty" style="font-size: 3rem; color: var(--accent-amber); margin-bottom: 16px;"></i>
          <h2 style="color: #ffffff; margin-bottom: 8px;">${escapeHtml(title)}</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px;">${escapeHtml(msg)}</p>
          <a href="products.html" class="btn btn-primary">
            <i class="fa-solid fa-arrow-left"></i> Browse Complete Catalogue
          </a>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ----------------------------------------------------
  // INITIALIZE ON DOM READY
  // ----------------------------------------------------
  function bootProductDetail() {
    initTabs();
    loadProduct();
    if (typeof window.addEventListener === "function") {
      window.addEventListener("popstate", loadProduct);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootProductDetail);
  } else {
    bootProductDetail();
  }

})();
