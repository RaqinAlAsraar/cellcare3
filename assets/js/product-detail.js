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

    function matchProduct(targetStr, list) {
      if (!targetStr || !Array.isArray(list) || !list.length) return null;
      let norm = "";
      try { norm = decodeURIComponent(targetStr).toLowerCase().trim(); } catch (e) { norm = targetStr.toLowerCase().trim(); }
      
      return list.find(p => {
        const pId = String(p.id || "").toLowerCase();
        const pSku = String(p.sku || "").toLowerCase();
        const pSlug = String(p.slug || "").toLowerCase();
        const pTitle = String(p.title || "").toLowerCase();
        return (
          pId === norm ||
          ("cc-" + pId) === norm ||
          pSku === norm ||
          ("cc-" + pSku) === norm ||
          pSlug === norm ||
          pTitle === norm ||
          pTitle.includes(norm) ||
          norm.includes(pSlug) ||
          norm.includes(pId)
        );
      });
    }

    let found = null;
    if (allProducts.length > 0) {
      found = target ? matchProduct(target, allProducts) : allProducts[0];
      if (found) {
        currentProduct = found;
        clearDetailSkeleton();
        renderProductDetails(found);
        loadRelatedProducts(allProducts, found);
      }
    }

    // 3. Concurrently fetch fresh product details directly from live Google Sheets API
    try {
      const gsheetUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.productsApi) || "https://script.google.com/macros/s/AKfycbzPASrJpC5dvoFX-R6zX1AfW-pFyg8DIM6D_p9DG4QSI16qyymFXzibseq1rA9r_f-j2g/exec";

      const gsheetRes = await fetch(`${gsheetUrl}?page=1&page_size=100`).then(r => r.ok ? r.json() : null).catch(() => null);

      if (gsheetRes) {
        const gItems = gsheetRes.items || gsheetRes.results || [];
        const mergedMap = new Map();

        gItems.forEach(p => {
          if (!p.title) return;
          const k = (p.title || String(p.id)).toLowerCase();
          if (!mergedMap.has(k)) {
            mergedMap.set(k, {
              ...p,
              id: String(p.id || p.sku || k),
              slug: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              title: p.title,
              price: Number(p.price) || 0,
              category: p.category || "General",
              image_url: p.image_url || "assets/images/hero.svg",
              description: p.description || "",
              available: p.available !== false,
              min_quantity: Number(p.min_quantity || p.moq) || 1
            });
          }
        });

        allProducts = Array.from(mergedMap.values());
        if (allProducts.length) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: allProducts })); } catch (e) {}

          const resolved = target ? matchProduct(target, allProducts) : allProducts[0];
          if (resolved) {
            currentProduct = resolved;
            clearDetailSkeleton();
            renderProductDetails(resolved);
            loadRelatedProducts(allProducts, resolved);
          } else if (allProducts[0]) {
            currentProduct = allProducts[0];
            clearDetailSkeleton();
            renderProductDetails(currentProduct);
            loadRelatedProducts(allProducts, currentProduct);
          }
        }
      } else if (!currentProduct && allProducts.length === 0) {
        showErrorState("Product Unavailable", "The requested product specification could not be retrieved from the catalog.");
      }
    } catch (err) {
      console.debug("Live detail fetch note:", err);
      if (!currentProduct && allProducts.length === 0) {
        showErrorState("Connection Error", "Could not load product details. Please check your internet connection.");
      }
    } finally {
      if (window.finishPreloader) window.finishPreloader();
    }
  }


  // ----------------------------------------------------
  // 2. RENDER DETAILS & INJECT DYNAMIC SEO
  // ----------------------------------------------------
  function renderProductDetails(p) {
    const title = p.title || "Industrial Product Specification";
    const category = p.category || "General";
    const desc = p.description || p.mini_desc || "";
    const priceNum = Number(p.price) || 0;
    const formattedPrice = priceNum ? `₹${priceNum.toLocaleString("en-IN")}` : "Contact for B2B Pricing";
    const minQty = parseInt(p.min_quantity || p.moq || 1, 10);
    const imgUrl = p.image_url || "assets/images/hero.svg";
    const isAvailable = p.available !== false;

    // 1. Update Document Title & SEO Meta Tags
    document.title = `${title} | Cell Care India`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = desc ? `${desc.substring(0, 150)}... Official supply by Cell Care India.` : `B2B wholesale pricing and quotation for ${title} from Cell Care India.`;
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
      const checkSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      const clockSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      badgeStock.innerHTML = `${isAvailable ? checkSvg : clockSvg} ${isAvailable ? "In Stock & Ready to Dispatch" : "Advance Order / Lead Time"}`;
    }

    const badgeCategory = document.getElementById("detailCategoryBadge");
    if (badgeCategory) {
      badgeCategory.textContent = category;
    }

    // 5. Update Information Panel
    const catTag = document.getElementById("detailCategoryTag");
    if (catTag) catTag.textContent = category;
    const catMeta = document.getElementById("detailCategoryMeta");
    if (catMeta) catMeta.textContent = category;
    const titleEl = document.getElementById("detailTitle");
    if (titleEl) titleEl.textContent = title;
    const skuEl = document.getElementById("detailSku");
    if (skuEl) skuEl.textContent = `SKU: CC-${p.slug || p.sku || p.id || "IND"}`;
    const priceEl = document.getElementById("detailPrice");
    if (priceEl) priceEl.textContent = formattedPrice;
    const descEl = document.getElementById("detailDesc");
    if (descEl) {
      descEl.textContent = desc || "Official manufacturer product specification by Cell Care India. Direct factory supply with pan-India distribution.";
    }
    const moqEl = document.getElementById("detailMoqNumber");
    if (moqEl) moqEl.textContent = `${minQty} Unit${minQty > 1 ? "s" : ""}`;

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
          subtotalText.innerHTML = `Order Quantity: <strong>${qty} Unit${qty > 1 ? "s" : ""}</strong>`;
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
        const qty = parseInt(stepperInput ? stepperInput.value : minQty, 10) || minQty;
        if (window.CellCare) {
          window.CellCare.addToCart(p, qty);
        }
      };
    }

    const waQuoteBtn = document.getElementById("detailWaQuoteBtn");
    if (waQuoteBtn) {
      waQuoteBtn.onclick = () => {
        const qty = parseInt(stepperInput ? stepperInput.value : minQty, 10) || minQty;
        const msg = `Hello Cell Care India! I would like to inquire about:\n\n• Product: *${title}*\n• SKU: *CC-${p.slug || p.sku || p.id || "IND"}*\n• Required Quantity: *${qty} Unit(s)*\n• Listed Price: *${formattedPrice}*\n\nPlease share current stock availability and delivery schedule.`;
        if (window.CellCare && typeof window.CellCare.openWhatsApp === "function") {
          window.CellCare.openWhatsApp(msg);
        } else {
          const url = `https://wa.me/918505910581?text=${encodeURIComponent(msg)}`;
          window.location.href = url;
        }
      };
    }

    // 8. Generate Specifications Table (Strictly Factual)
    populateSpecificationsTable(p);
  }

  // ----------------------------------------------------
  // 3. SPECIFICATIONS MATRIX GENERATOR (STRICTLY FACTUAL)
  // ----------------------------------------------------
  function populateSpecificationsTable(p) {
    const tableBody = document.getElementById("detailSpecsTableBody");
    if (!tableBody) return;

    const minQty = parseInt(p.min_quantity || p.moq || 1, 10);
    const priceNum = Number(p.price) || 0;

    const specs = [
      { label: "Product Name", value: p.title || "Industrial Unit" },
      { label: "Category", value: p.category || "General" },
      { label: "Part Reference / SKU", value: `CC-${p.slug || p.sku || p.id || "IND"}` },
      { label: "Minimum Order Quantity (MOQ)", value: `${minQty} Unit${minQty > 1 ? "s" : ""}` },
      { label: "Stock Availability", value: p.available !== false ? "In Stock (Pan-India Dispatch)" : "Available on Advance Order" }
    ];

    if (priceNum > 0) {
      specs.push({ label: "Listed Wholesale Price", value: `₹${priceNum.toLocaleString("en-IN")} / Unit` });
    }

    // Factual client attributes from Google Sheet / Artfy
    if (p.voltage) specs.push({ label: "Voltage", value: String(p.voltage) });
    if (p.capacity) specs.push({ label: "Capacity", value: String(p.capacity) });
    if (p.chemistry) specs.push({ label: "Chemistry", value: String(p.chemistry) });
    if (p.model) specs.push({ label: "Model / Series", value: String(p.model) });
    if (p.brand) specs.push({ label: "Brand / Make", value: String(p.brand) });
    if (p.dimensions) specs.push({ label: "Dimensions", value: String(p.dimensions) });
    if (p.weight) specs.push({ label: "Weight", value: String(p.weight) });
    if (p.warranty) specs.push({ label: "Warranty", value: String(p.warranty) });
    if (p.material) specs.push({ label: "Material / Casing", value: String(p.material) });

    // Handle any key-value pairs inside custom specs object if provided by client
    if (p.specs && typeof p.specs === "object") {
      Object.entries(p.specs).forEach(([k, v]) => {
        if (v && typeof v !== "object") {
          const readableKey = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          if (!specs.some(s => s.label.toLowerCase() === readableKey.toLowerCase())) {
            specs.push({ label: readableKey, value: String(v) });
          }
        }
      });
    }

    tableBody.innerHTML = specs.map(s => `
      <tr>
        <td style="width:38%; text-align:left; padding:12px 14px; color:var(--text-muted); font-weight:500; border-right:1px solid var(--border-subtle);">${escapeHtml(s.label)}</td>
        <td style="padding:12px 14px; color:#ffffff; font-family:var(--font-mono); font-weight:600;">${escapeHtml(s.value)}</td>
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
      const minQ = parseInt(p.min_quantity || p.moq || 1, 10);

      const card = document.createElement("article");
      card.className = "product-card";
      card.style.cursor = "pointer";
      card.style.boxShadow = "var(--shadow-sm)";

      const infoIcon = (window.CellCare && window.CellCare.svg && window.CellCare.svg.info) || '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      const cartIcon = (window.CellCare && window.CellCare.svg && window.CellCare.svg.cart) || '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

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
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;">
            <a href="${detailUrl}" class="btn btn-secondary btn-sm btn-related-view" style="width: 100%; justify-content: center;">
              ${infoIcon} Specs
            </a>
            <button type="button" class="btn btn-primary btn-sm btn-related-quote" style="width: 100%; justify-content: center;">
              ${cartIcon} Quote
            </button>
          </div>
        </div>
      `;

      function openRelatedProduct(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (window.history && window.history.pushState) {
          window.history.pushState({ id: targetParam }, "", detailUrl);
        } else {
          window.location.href = detailUrl;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        loadProduct();
      }

      // 1. Click on card (excluding quote button) navigates to product
      card.addEventListener("click", (e) => {
        if (e.target && e.target.closest && e.target.closest(".btn-related-quote")) return;
        openRelatedProduct(e);
      });

      // 2. Click "Specs" button navigates smoothly
      const viewBtn = card.querySelector(".btn-related-view");
      if (viewBtn) {
        viewBtn.addEventListener("click", openRelatedProduct);
      }

      // 3. Click title link navigates smoothly
      const titleLink = card.querySelector(".product-card-title a");
      if (titleLink) {
        titleLink.addEventListener("click", openRelatedProduct);
      }

      // 4. Click "Quote" button adds to quotation cart
      const quoteBtn = card.querySelector(".btn-related-quote");
      if (quoteBtn) {
        quoteBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.CellCare && typeof window.CellCare.addToCart === "function") {
            window.CellCare.addToCart(p, minQ);
          }
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
    if (!tabBtns.length) return;

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

  function initProductZoom() {
    const galleryWrap = document.getElementById("galleryMainWrap");
    const mainImg = document.getElementById("detailMainImg");
    const zoomTrigger = document.getElementById("galleryZoomTrigger");
    const modal = document.getElementById("productZoomModal");
    const modalImg = document.getElementById("productZoomImg");
    const closeBtn = document.getElementById("productZoomClose");
    const backdrop = document.getElementById("productZoomBackdrop");

    if (!modal || !modalImg) return;

    function openZoom(e) {
      if (e) {
        // Prevent opening if clicking on an interactive badge link
        if (e.target && e.target.closest && e.target.closest(".gallery-badges-overlay a")) return;
      }
      const activeSrc = (mainImg && (mainImg.currentSrc || mainImg.src)) || "";
      if (!activeSrc) return;
      modalImg.src = activeSrc;
      modalImg.alt = (mainImg && mainImg.alt) || "Enlarged Product View";
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    function closeZoom() {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    if (galleryWrap) {
      galleryWrap.addEventListener("click", openZoom);
    }
    if (mainImg) {
      mainImg.addEventListener("click", openZoom);
    }
    if (zoomTrigger) {
      zoomTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        openZoom();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeZoom();
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", closeZoom);
    }
    modal.addEventListener("click", (e) => {
      // Close when tapping backdrop or outside the enlarged image
      if (e.target === modal || e.target === backdrop) {
        closeZoom();
      }
    });

    // Also allow tapping the zoomed image to dismiss on mobile
    if (modalImg) {
      modalImg.addEventListener("click", (e) => {
        // Close on direct tap for rapid mobile dismissal
        closeZoom();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("active")) {
        closeZoom();
      }
    });
  }

  function showErrorState(title, msg) {
    const layout = document.querySelector(".product-detail-layout");
    if (layout) {
      layout.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs);">
          <svg class="svg-icon" style="width: 48px; height: 48px; color: var(--accent-amber); margin-bottom: 16px;" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <h2 style="color: #ffffff; margin-bottom: 8px;">${escapeHtml(title)}</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px;">${escapeHtml(msg)}</p>
          <a href="products.html" class="btn btn-primary">
            <svg class="svg-icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Browse Complete Catalogue
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
    initProductZoom();
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
