/**
 * CELL CARE INDIA — CATALOG & PRODUCT ENGINE (v3.0)
 * High-performance search, multi-facet filtering, sorting, client caching,
 * stepper controls, lightbox image preview, and quote sync.
 */

(function () {
  "use strict";

  const CACHE_KEY = "cellcare_catalog_cache_v3";
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Catalog State
  const state = {
    products: [],
    categories: [],
    filteredProducts: [],
    query: "",
    category: "",
    sortBy: "default",
    inStockOnly: false,
    page: 1,
    pageSize: 12,
    viewMode: "grid" // 'grid' or 'list'
  };

  // DOM Elements (bound on init)
  let container = null;
  let searchInput = null;
  let categorySelect = null;
  let sortSelect = null;
  let inStockCheckbox = null;
  let chipsContainer = null;
  let paginationContainer = null;
  let resultCountEl = null;
  let clearFiltersBtn = null;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function bindDOMElements() {
    container = document.getElementById("productsGrid");
    searchInput = document.getElementById("catalogSearchInput");
    categorySelect = document.getElementById("catalogCategorySelect");
    sortSelect = document.getElementById("catalogSortSelect");
    inStockCheckbox = document.getElementById("catalogInStockOnly");
    chipsContainer = document.getElementById("categoryChipsContainer");
    paginationContainer = document.getElementById("catalogPagination");
    resultCountEl = document.getElementById("catalogResultCount");
    clearFiltersBtn = document.getElementById("clearFiltersBtn");
  }

  // ----------------------------------------------------
  // 1. SKELETON PRE-LOADER & LIVE DATA ENGINE
  // ----------------------------------------------------
  function renderSkeletonCards(count) {
    if (!container) return;
    const num = count || state.pageSize || 8;
    let html = "";
    for (let i = 0; i < num; i++) {
      html += `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-media skeleton-shimmer"></div>
          <div class="skeleton-content">
            <div class="skeleton-pill skeleton-shimmer"></div>
            <div class="skeleton-title-bar skeleton-shimmer"></div>
            <div class="skeleton-desc-bar skeleton-shimmer"></div>
            <div class="skeleton-desc-bar short skeleton-shimmer"></div>
            <div class="skeleton-moq-bar skeleton-shimmer"></div>
            <div class="skeleton-price-bar skeleton-shimmer"></div>
            <div class="skeleton-actions-row">
              <div class="skeleton-btn-bar skeleton-shimmer"></div>
              <div class="skeleton-btn-bar skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
    if (resultCountEl) {
      resultCountEl.innerHTML = `<span style="color:var(--accent-primary);"><svg class="svg-icon spin" viewBox="0 0 24 24" style="animation:spin 1s linear infinite; display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Synchronizing live inventory...</span>`;
    }
  }

  function renderFetchError() {
    if (!container) return;
    container.innerHTML = `
      <div class="preloader-status-box" style="grid-column: 1 / -1; padding: 60px 20px;">
        <div class="cyber-spinner" style="margin-bottom: 12px; border-top-color: var(--accent-amber);"></div>
        <h3 style="color:#ffffff;">Connecting to Master Inventory...</h3>
        <p style="color:var(--text-muted); max-width:480px; margin: 0 auto 16px;">
          Live synchronization from backend catalogue is taking a few moments. Please check your connection or tap below to reconnect.
        </p>
        <button id="catalogRetryBtn" class="btn btn-primary btn-md">
          <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Retry Connection
        </button>
      </div>
    `;
    const retryBtn = document.getElementById("catalogRetryBtn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        renderSkeletonCards(8);
        if (window.startPreloader) window.startPreloader();
        syncWithLiveApi(false);
      });
    }
    if (resultCountEl) {
      resultCountEl.innerHTML = `<span style="color:var(--accent-amber);"><svg class="svg-icon" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Reconnecting to server...</span>`;
    }
  }

  function initCatalogData() {
    if (!container) return;

    // 1. Immediately display cyber skeleton shimmer pre-loader
    if (window.startPreloader) window.startPreloader();
    renderSkeletonCards(8);

    // 2. Fast hydrate from session cache if user navigated back
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          state.products = parsed.items;
          extractCategoriesFromProducts();
          populateCategoryFilters();
          applyFiltersAndRender();
          if (window.finishPreloader) window.finishPreloader();
          // Silently sync fresh data in background
          syncWithLiveApi(true);
          return;
        }
      }
    } catch (e) {}

    // 3. Directly sync live data from external backend APIs
    syncWithLiveApi(false);
  }

  function extractCategoriesFromProducts() {
    const uniqueCats = new Set();
    state.products.forEach(p => {
      if (p.category) uniqueCats.add(p.category);
    });
    state.categories = Array.from(uniqueCats).map(name => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-")
    }));
  }

  async function syncWithLiveApi(isBackground) {
    try {
      const artifyUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.artifyProductsApi) || "https://artifyscreens.pythonanywhere.com/api/products/";
      const gsheetUrl = (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.productsApi) || "https://script.google.com/macros/s/AKfycbzPASrJpC5dvoFX-R6zX1AfW-pFyg8DIM6D_p9DG4QSI16qyymFXzibseq1rA9r_f-j2g/exec";

      const promises = [
        fetch(`${artifyUrl}?page=1&page_size=100`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${gsheetUrl}?page=1&page_size=100`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("https://artifyscreens.pythonanywhere.com/api/categories/").then(r => r.ok ? r.json() : null).catch(() => null)
      ];

      const [artifyData, gsheetData, catData] = await Promise.all(promises);
      const mergedMap = new Map();

      // Ingest live Artifyscreens products
      if (artifyData && Array.isArray(artifyData.items)) {
        artifyData.items.forEach(p => {
          if (!p.title || !p.title.trim()) return;
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

      // Ingest Google Sheet live items
      if (gsheetData) {
        const gItems = gsheetData.items || gsheetData.results || [];
        gItems.forEach(p => {
          if (!p.title || !p.title.trim()) return;
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

      if (mergedMap.size > 0) {
        state.products = Array.from(mergedMap.values());

        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: state.products }));
        } catch (e) {}

        if (catData && Array.isArray(catData.categories)) {
          const catMap = new Map();
          catData.categories.forEach(c => {
            if (c && c.name) catMap.set(c.slug || c.name.toLowerCase(), { name: c.name, slug: c.slug });
          });
          state.products.forEach(p => {
            if (p.category) {
              const sl = p.category.toLowerCase().replace(/\s+/g, "-");
              if (!catMap.has(sl)) catMap.set(sl, { name: p.category, slug: sl });
            }
          });
          state.categories = Array.from(catMap.values());
        } else {
          extractCategoriesFromProducts();
        }

        populateCategoryFilters();
        applyFiltersAndRender();
        if (window.finishPreloader) window.finishPreloader();
      } else {
        if (!isBackground && state.products.length === 0) {
          renderFetchError();
          if (window.finishPreloader) window.finishPreloader();
        }
      }
    } catch (e) {
      console.debug("Backend sync error:", e);
      if (!isBackground && state.products.length === 0) {
        renderFetchError();
        if (window.finishPreloader) window.finishPreloader();
      }
    }
  }


  // ----------------------------------------------------
  // 2. FILTER & SORT PIPELINE
  // ----------------------------------------------------
  function populateCategoryFilters() {
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">All Categories</option>';
      state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.slug || cat.name;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
      });
      if (state.category) categorySelect.value = state.category;
    }

    if (chipsContainer) {
      chipsContainer.innerHTML = `
        <button class="category-chip ${state.category === "" ? "active" : ""}" data-slug="">
          All Products
        </button>
      `;
      state.categories.forEach(cat => {
        const slug = cat.slug || cat.name;
        const btn = document.createElement("button");
        btn.className = `category-chip ${state.category === slug ? "active" : ""}`;
        btn.dataset.slug = slug;
        btn.textContent = cat.name;
        chipsContainer.appendChild(btn);
      });
    }
  }

  function applyFiltersAndRender() {
    let result = state.products.slice();

    // 1. Search Query Filter (Title, Description, Category, SKU)
    if (state.query) {
      const q = state.query.toLowerCase();
      result = result.filter(p => {
        const titleMatch = (p.title || "").toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q);
        const catMatch = (p.category || "").toLowerCase().includes(q);
        const skuMatch = (String(p.id || "")).toLowerCase().includes(q);
        return titleMatch || descMatch || catMatch || skuMatch;
      });
    }

    // 2. Category Filter
    if (state.category) {
      const catMatchSlug = state.category.toLowerCase();
      result = result.filter(p => {
        const cat = (p.category || "").toLowerCase().replace(/\s+/g, "-");
        return cat === catMatchSlug || (p.category || "").toLowerCase() === catMatchSlug;
      });
    }

    // 3. In-Stock Filter
    if (state.inStockOnly) {
      result = result.filter(p => p.available !== false);
    }

    // 4. Sorting
    if (state.sortBy === "price-low") {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (state.sortBy === "price-high") {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (state.sortBy === "name-asc") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (state.sortBy === "name-desc") {
      result.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else if (state.sortBy === "moq-low") {
      result.sort((a, b) => (Number(a.min_quantity) || 1) - (Number(b.min_quantity) || 1));
    }

    state.filteredProducts = result;

    // Update Result Counter
    if (resultCountEl) {
      resultCountEl.innerHTML = `Showing <strong>${result.length}</strong> battery products`;
    }

    // Render Paginated Cards
    renderCards();
    renderPagination();
    syncUrlParams();
  }

  // ----------------------------------------------------
  // 3. RENDER PRODUCT CARDS
  // ----------------------------------------------------
  function renderCards() {
    if (!container) return;
    container.classList.toggle("list-view", state.viewMode === "list");
    container.innerHTML = "";

    const items = state.filteredProducts;

    const svg = (window.CellCare && window.CellCare.svg) || {};

    if (!items.length) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs);">
          <svg class="svg-icon" style="width: 44px; height: 44px; stroke-width: 1.5; color: var(--text-faint); margin-bottom: 16px;" viewBox="0 0 24 24"><rect x="2" y="7" width="16" height="10" rx="0"></rect><line x1="22" y1="11" x2="22" y2="13"></line><line x1="6" y1="11" x2="6" y2="13"></line></svg>
          <h3 style="color: #ffffff; margin-bottom: 8px;">No matching battery specifications</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 0.9rem;">Try adjusting your voltage/capacity search terms or resetting category filters.</p>
          <button class="btn btn-outline" id="resetFiltersInnerBtn">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById("resetFiltersInnerBtn");
      if (resetBtn) resetBtn.addEventListener("click", resetAllFilters);
      return;
    }

    const startIndex = (state.page - 1) * state.pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + state.pageSize);

    paginatedItems.forEach(p => {
      const card = createProductCardElement(p);
      container.appendChild(card);
    });
  }

  function createProductCardElement(p) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = p.id;

    const imgUrl = p.image_url || "assets/images/hero.svg";
    const title = p.title || "Industrial Battery Unit";
    const desc = p.description || "High-performance Grade-A battery pack engineered with active BMS safety protection.";
    const priceNum = Number(p.price) || 0;
    const formattedPrice = priceNum ? `₹${priceNum.toLocaleString("en-IN")}` : "Contact for Price";
    const minQty = parseInt(p.min_quantity || p.moq || 1, 10);
    const isAvailable = p.available !== false;
    const category = p.category || "Lithium-Ion";

    const detailUrl = `product.html?id=${encodeURIComponent(p.slug || p.id || p.title)}`;

    // Get current qty in cart
    const cartItem = window.CellCare ? window.CellCare.cart[p.id] : null;
    const currentQty = cartItem ? cartItem.qty : minQty;
    const svg = (window.CellCare && window.CellCare.svg) || {};

    card.innerHTML = `
      <div class="product-card-media">
        <a href="${detailUrl}" class="product-card-media-link" aria-label="${escapeHtml(title)}" style="display:block; width:100%; height:100%;">
          <img src="${imgUrl}" class="product-card-img" alt="${escapeHtml(title)}" loading="lazy" />
        </a>
        <div class="product-card-badges">
          <span class="badge ${isAvailable ? "badge-success" : "badge-danger"}">
            ${isAvailable ? (svg.check || "") : (svg.info || "")} ${isAvailable ? "In Stock" : "Pre-Order"}
          </span>
          <span class="badge badge-cyan">${escapeHtml(category)}</span>
        </div>
      </div>

      <div class="product-card-content">
        <span class="product-card-category">${escapeHtml(category)}</span>
        <h3 class="product-card-title">
          <a href="${detailUrl}">${escapeHtml(title)}</a>
        </h3>
        <p class="product-card-desc">${escapeHtml(desc)}</p>
        
        <div class="product-card-moq">
          ${svg.boxes || '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'} Minimum Order: <strong>${minQty} Units</strong>
        </div>

        <div class="product-card-pricing">
          <div>
            <div class="product-price-val">${formattedPrice}</div>
            <div class="product-price-label">Ex-factory + GST inclusive pricing</div>
          </div>
        </div>

        <div class="product-card-actions">
          <div class="card-stepper-row">
            <div class="qty-stepper">
              <button class="stepper-btn btn-minus" data-id="${p.id}" data-min="${minQty}">−</button>
              <input type="text" class="stepper-input qty-input" value="${currentQty}" readonly data-min="${minQty}" data-step="${minQty}" />
              <button class="stepper-btn btn-plus" data-id="${p.id}" data-step="${minQty}">+</button>
            </div>
            <button class="btn btn-primary btn-sm btn-add-quote" data-id="${p.id}" style="flex:1.2;">
              ${svg.cart || ""} Add to Quote
            </button>
          </div>

          <div class="card-btn-grid">
            <a href="${detailUrl}" class="btn btn-secondary btn-sm">
              ${svg.info || ""} Specs &amp; CAD
            </a>
            <button class="btn btn-whatsapp btn-sm btn-order-wa" data-id="${p.id}">
              ${svg.whatsapp || ""} Inquiry
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach Stepper & Action Listeners
    attachCardListeners(card, p);

    return card;
  }

  function attachCardListeners(card, product) {
    const input = card.querySelector(".qty-input");
    const minusBtn = card.querySelector(".btn-minus");
    const plusBtn = card.querySelector(".btn-plus");
    const addQuoteBtn = card.querySelector(".btn-add-quote");
    const orderWaBtn = card.querySelector(".btn-order-wa");

    const minQty = parseInt(input.dataset.min, 10);
    const step = parseInt(input.dataset.step, 10);

    plusBtn.addEventListener("click", () => {
      let cur = parseInt(input.value, 10) || minQty;
      input.value = cur + step;
    });

    minusBtn.addEventListener("click", () => {
      let cur = parseInt(input.value, 10) || minQty;
      if (cur > minQty) {
        input.value = cur - step;
      }
    });

    addQuoteBtn.addEventListener("click", () => {
      const selectedQty = parseInt(input.value, 10) || minQty;
      if (window.CellCare) {
        window.CellCare.addToCart(product, selectedQty);
      }
    });

    orderWaBtn.addEventListener("click", () => {
      const selectedQty = parseInt(input.value, 10) || minQty;
      const priceStr = Number(product.price) ? `₹${Number(product.price).toLocaleString("en-IN")}` : "Contact for Quote";
      const message = `Hello Cell Care India! I want a direct quotation for:\n\n• Product: *${product.title}*\n• Quantity: *${selectedQty} units*\n• Listed Price: *${priceStr}*\n\nPlease share lead time and delivery terms.`;
      if (window.CellCare && typeof window.CellCare.openWhatsApp === "function") {
        window.CellCare.openWhatsApp(message);
      } else {
        const url = `https://wa.me/918505910581?text=${encodeURIComponent(message)}`;
        window.location.href = url;
      }
    });
  }

  // ----------------------------------------------------
  // 4. PAGINATION
  // ----------------------------------------------------
  function renderPagination() {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(state.filteredProducts.length / state.pageSize);
    if (totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-num-btn";
    prevBtn.setAttribute("aria-label", "Previous Page");
    prevBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    prevBtn.disabled = state.page === 1;
    prevBtn.onclick = () => {
      state.page--;
      renderCards();
      renderPagination();
      window.scrollTo({ top: container.offsetTop - 120, behavior: "smooth" });
    };
    paginationContainer.appendChild(prevBtn);

    // Number Buttons
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.className = `page-num-btn ${i === state.page ? "active" : ""}`;
      btn.textContent = i;
      btn.onclick = () => {
        state.page = i;
        renderCards();
        renderPagination();
        window.scrollTo({ top: container.offsetTop - 120, behavior: "smooth" });
      };
      paginationContainer.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-num-btn";
    nextBtn.setAttribute("aria-label", "Next Page");
    nextBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    nextBtn.disabled = state.page === totalPages;
    nextBtn.onclick = () => {
      state.page++;
      renderCards();
      renderPagination();
      window.scrollTo({ top: container.offsetTop - 120, behavior: "smooth" });
    };
    paginationContainer.appendChild(nextBtn);
  }

  // ----------------------------------------------------
  // 5. EVENT HANDLERS & URL SYNC
  // ----------------------------------------------------
  function resetAllFilters() {
    state.query = "";
    state.category = "";
    state.sortBy = "default";
    state.inStockOnly = false;
    state.page = 1;

    if (searchInput) searchInput.value = "";
    if (categorySelect) categorySelect.value = "";
    if (sortSelect) sortSelect.value = "default";
    if (inStockCheckbox) inStockCheckbox.checked = false;

    populateCategoryFilters();
    applyFiltersAndRender();
  }

  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("q")) state.query = params.get("q");
    if (params.has("category")) state.category = params.get("category");
    if (params.has("sort")) state.sortBy = params.get("sort");
    if (params.has("inStock")) state.inStockOnly = params.get("inStock") === "true";
    if (params.has("page")) state.page = parseInt(params.get("page"), 10) || 1;

    if (searchInput && state.query) searchInput.value = state.query;
    if (sortSelect && state.sortBy) sortSelect.value = state.sortBy;
    if (inStockCheckbox) inStockCheckbox.checked = state.inStockOnly;
  }

  function syncUrlParams() {
    try {
      if (!window.history || typeof window.history.replaceState !== "function") return;
      if (window.location && window.location.protocol === "file:") return;

      const params = new URLSearchParams();
      if (state.query) params.set("q", state.query);
      if (state.category) params.set("category", state.category);
      if (state.sortBy !== "default") params.set("sort", state.sortBy);
      if (state.inStockOnly) params.set("inStock", "true");
      if (state.page > 1) params.set("page", state.page);

      const pathname = (window.location && window.location.pathname) || "";
      const newUrl = pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
    } catch (e) {
      // Safe no-op on file:// origin or restricted sandboxes
    }
  }

  function initListeners() {
    // Debounced Search Input
    if (searchInput) {
      let timeout;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          state.query = e.target.value.trim();
          state.page = 1;
          applyFiltersAndRender();
        }, 300);
      });
    }

    // Category Select
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        state.category = e.target.value;
        state.page = 1;
        populateCategoryFilters();
        applyFiltersAndRender();
      });
    }

    // Category Chips
    if (chipsContainer) {
      chipsContainer.addEventListener("click", (e) => {
        const chip = e.target.closest(".category-chip");
        if (!chip) return;
        state.category = chip.dataset.slug || "";
        state.page = 1;
        if (categorySelect) categorySelect.value = state.category;
        populateCategoryFilters();
        applyFiltersAndRender();
      });
    }

    // Sort Select
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        state.page = 1;
        applyFiltersAndRender();
      });
    }

    // In Stock Only
    if (inStockCheckbox) {
      inStockCheckbox.addEventListener("change", (e) => {
        state.inStockOnly = e.target.checked;
        state.page = 1;
        applyFiltersAndRender();
      });
    }

    // Clear Filters Button
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", resetAllFilters);
    }

    // Grid vs List View Buttons
    const gridBtn = document.getElementById("viewGridBtn");
    const listBtn = document.getElementById("viewListBtn");
    if (gridBtn && listBtn && container) {
      const setViewMode = (mode) => {
        state.viewMode = mode;
        if (mode === "list") {
          listBtn.classList.add("active");
          gridBtn.classList.remove("active");
          container.classList.add("list-view");
        } else {
          gridBtn.classList.add("active");
          listBtn.classList.remove("active");
          container.classList.remove("list-view");
        }
        try { localStorage.setItem("cellcare_view_mode", mode); } catch (e) {}
      };

      gridBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setViewMode("grid");
      });
      listBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setViewMode("list");
      });

      // Restore saved view preference
      try {
        const savedMode = localStorage.getItem("cellcare_view_mode");
        if (savedMode === "list") {
          setViewMode("list");
        }
      } catch (e) {}
    }
  }

  // ----------------------------------------------------
  // 6. INITIALIZE
  // ----------------------------------------------------
  function bootCatalog() {
    bindDOMElements();
    initListeners();
    readUrlParams();
    initCatalogData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCatalog);
  } else {
    bootCatalog();
  }

})();
