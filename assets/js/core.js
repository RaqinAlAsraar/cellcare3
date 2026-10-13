/**
 * CELL CARE INDIA — CORE JAVASCRIPT FRAMEWORK (v3.0)
 * Centralized cart state, drawer, toast, config loader, and WhatsApp routing.
 */

(function (window, document) {
  "use strict";

  const STORAGE_KEY = "cellcare_cart_v3";
  const CONFIG_STORAGE_KEY = "cellcare_config_cache_v3";

  // Global namespace
  window.CellCare = {
    cart: {},
    siteConfig: null,

    // ----------------------------------------------------
    // 1. INITIALIZATION
    // ----------------------------------------------------
    init: function () {
      this.loadCartFromStorage();
      this.initNavbar();
      this.initDrawer();
      this.loadSiteConfig();
      this.updateCartUI();
    },

    // ----------------------------------------------------
    // 2. CONFIG LOADER (PYTHONANYWHERE REST API)
    // ----------------------------------------------------
    loadSiteConfig: async function () {
      // 1. Try local cache first for instant rendering
      try {
        const cached = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (cached) {
          this.siteConfig = JSON.parse(cached);
          this.applyConfigToDOM(this.siteConfig);
        }
      } catch (e) {
        console.warn("Config cache read error", e);
      }

      // 2. Fresh fetch in background
      try {
        const base = window.CELLCARE_CONFIG ? window.CELLCARE_CONFIG.siteApi : "https://artifyscreens.pythonanywhere.com";
        const res = await fetch(`${base}/api/config/`, { method: "GET", mode: "cors" });
        if (res.ok) {
          const data = await res.json();
          this.siteConfig = data;
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
          this.applyConfigToDOM(data);
        }
      } catch (err) {
        console.warn("Could not fetch fresh site config, using fallback/cache", err);
        if (!this.siteConfig && window.CELLCARE_CONFIG) {
          this.siteConfig = window.CELLCARE_CONFIG.fallback;
          this.applyConfigToDOM(this.siteConfig);
        }
      }
    },

    applyConfigToDOM: function (cfg) {
      if (!cfg) return;

      const email = cfg.contact_email || cfg.site_email || cfg.email || "sales@cellcareindia.com";
      const phone = cfg.whatsapp_number || cfg.whatsapp_phone || cfg.phone || "+91 85059 10581";
      const address = cfg.address || "New Delhi, India";

      // Update footers or headers if present
      document.querySelectorAll("[data-bind='site-email']").forEach(el => el.textContent = email);
      document.querySelectorAll("[data-bind='site-phone']").forEach(el => el.textContent = phone);
      document.querySelectorAll("[data-bind='site-address']").forEach(el => el.textContent = address);

      // Social Links
      const socials = cfg.social || {};
      const fb = socials.facebook || cfg.facebook;
      const tw = socials.twitter || cfg.twitter;
      const ig = socials.instagram || cfg.instagram;
      const li = socials.linkedin || cfg.linkedin;

      if (fb) document.querySelectorAll(".social-facebook").forEach(el => el.href = fb);
      if (tw) document.querySelectorAll(".social-twitter").forEach(el => el.href = tw);
      if (ig) document.querySelectorAll(".social-instagram").forEach(el => el.href = ig);
      if (li) document.querySelectorAll(".social-linkedin").forEach(el => el.href = li);
    },

    getWhatsAppNumber: function () {
      if (this.siteConfig) {
        const raw = this.siteConfig.whatsapp_phone || this.siteConfig.whatsapp_number || this.siteConfig.whatsapp || "";
        const clean = raw.replace(/\D/g, "");
        if (clean.length === 10) return "91" + clean;
        if (clean.length > 10) return clean;
      }
      if (window.CELLCARE_CONFIG && window.CELLCARE_CONFIG.fallback && window.CELLCARE_CONFIG.fallback.whatsapp) {
        const clean = window.CELLCARE_CONFIG.fallback.whatsapp.replace(/\D/g, "");
        if (clean.length === 10) return "91" + clean;
        if (clean.length > 10) return clean;
      }
      return "918505910581";
    },

    // ----------------------------------------------------
    // 3. CART MANAGEMENT (LOCALSTORAGE SYNCHRONIZED)
    // ----------------------------------------------------
    loadCartFromStorage: function () {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        this.cart = data ? JSON.parse(data) : {};
      } catch (e) {
        this.cart = {};
      }
    },

    saveCartToStorage: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cart));
      } catch (e) {
        console.warn("Storage full or unavailable", e);
      }
      this.updateCartUI();
    },

    addToCart: function (product, qtyToAdd) {
      const id = String(product.id || product.slug || product.title);
      const minQty = parseInt(product.min_quantity || product.moq || product.min_qty || 1, 10);
      const step = minQty;
      const price = parseFloat(product.price || 0);

      const addCount = qtyToAdd || minQty;

      if (this.cart[id]) {
        this.cart[id].qty += addCount;
      } else {
        this.cart[id] = {
          id: id,
          title: product.title || "Battery Unit",
          price: price,
          qty: addCount,
          minQty: minQty,
          step: step,
          image_url: product.image_url || "assets/images/hero.svg"
        };
      }

      this.saveCartToStorage();
      this.toast(`Added ${addCount}x ${product.title} to Quote!`, "success");
      this.openDrawer();
    },

    updateCartItemQty: function (id, newQty) {
      if (!this.cart[id]) return;
      const min = this.cart[id].minQty || 1;
      const step = this.cart[id].step || 1;

      if (newQty < min) {
        delete this.cart[id];
        this.toast("Item removed from quote", "info");
      } else {
        this.cart[id].qty = newQty;
      }

      this.saveCartToStorage();
    },

    removeFromCart: function (id) {
      if (this.cart[id]) {
        delete this.cart[id];
        this.saveCartToStorage();
        this.toast("Item removed from quote", "info");
      }
    },

    clearCart: function () {
      this.cart = {};
      this.saveCartToStorage();
    },

    getCartCount: function () {
      let count = 0;
      Object.values(this.cart).forEach(item => count += item.qty);
      return count;
    },

    getCartTotal: function () {
      let sum = 0;
      Object.values(this.cart).forEach(item => sum += (item.qty * item.price));
      return sum;
    },

    // ----------------------------------------------------
    // 4. UI SYNCHRONIZATION (BADGES & DRAWER)
    // ----------------------------------------------------
    updateCartUI: function () {
      const count = this.getCartCount();
      const total = this.getCartTotal();

      // Update navbar badges
      document.querySelectorAll(".cart-count-badge").forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? "inline-block" : "none";
      });

      // Update drawer elements if present
      const drawerItems = document.getElementById("quoteDrawerItems");
      const drawerTotal = document.getElementById("quoteDrawerTotal");
      const drawerSubtotalCount = document.getElementById("quoteDrawerCountText");

      if (drawerSubtotalCount) {
        drawerSubtotalCount.textContent = `Subtotal (${count} items)`;
      }

      if (drawerTotal) {
        drawerTotal.textContent = total > 0 ? `₹${total.toLocaleString("en-IN")}` : "Contact for Quote";
      }

      if (drawerItems) {
        const items = Object.values(this.cart);
        if (items.length === 0) {
          drawerItems.innerHTML = `
            <div style="text-align:center; padding: 40px 10px; color: var(--text-muted);">
              <i class="fa-solid fa-cart-shopping" style="font-size: 2.5rem; margin-bottom: 14px; opacity: 0.3;"></i>
              <p style="font-weight: 500;">Your quotation cart is empty.</p>
              <a href="products.html" class="btn btn-outline btn-sm" style="margin-top: 14px;">Browse Products</a>
            </div>
          `;
        } else {
          drawerItems.innerHTML = items.map(item => `
            <div class="quote-item-row" data-id="${item.id}">
              <div class="quote-item-info">
                <div class="quote-item-title">${escapeHtml(item.title)}</div>
                <div class="quote-item-meta">Qty: <strong>${item.qty}</strong> (Min: ${item.minQty})</div>
              </div>
              <div class="quote-item-actions">
                <div class="quote-item-price">
                  ${item.price > 0 ? `₹${(item.qty * item.price).toLocaleString("en-IN")}` : "B2B Quote"}
                </div>
                <button class="quote-item-remove" onclick="CellCare.removeFromCart('${item.id}')" title="Remove item">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          `).join("");
        }
      }
    },

    // ----------------------------------------------------
    // 5. NAVBAR & SIDEBAR CONTROLS
    // ----------------------------------------------------
    initNavbar: function () {
      const header = document.querySelector(".site-header");
      if (header) {
        window.addEventListener("scroll", () => {
          if (window.scrollY > 30) header.classList.add("scrolled");
          else header.classList.remove("scrolled");
        });
      }

      const hamburger = document.getElementById("hamburgerBtn");
      const sidebar = document.getElementById("mobileSidebar");
      const backdrop = document.getElementById("overlayBackdrop");
      const closeBtn = document.getElementById("closeSidebarBtn");

      if (hamburger && sidebar && backdrop) {
        hamburger.addEventListener("click", () => {
          sidebar.classList.add("open");
          backdrop.classList.add("active");
        });

        const closeSidebar = () => {
          sidebar.classList.remove("open");
          backdrop.classList.remove("active");
        };

        if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
        backdrop.addEventListener("click", closeSidebar);
      }
    },

    // ----------------------------------------------------
    // 6. QUOTE DRAWER CONTROLS
    // ----------------------------------------------------
    initDrawer: function () {
      const drawer = document.getElementById("quoteDrawer");
      const backdrop = document.getElementById("overlayBackdrop");
      const closeBtn = document.getElementById("quoteDrawerClose");
      const proceedBtn = document.getElementById("quoteDrawerProceed");

      if (closeBtn && drawer) {
        closeBtn.addEventListener("click", () => this.closeDrawer());
      }

      if (proceedBtn) {
        proceedBtn.addEventListener("click", () => {
          if (this.getCartCount() === 0) {
            this.toast("Your quote cart is empty. Add items first!", "error");
            return;
          }
          window.location.href = "checkout.html";
        });
      }

      // Hook all buttons with class .open-quote-drawer
      document.querySelectorAll(".open-quote-drawer").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.openDrawer();
        });
      });
    },

    openDrawer: function () {
      const drawer = document.getElementById("quoteDrawer");
      const backdrop = document.getElementById("overlayBackdrop");
      if (drawer && backdrop) {
        this.updateCartUI();
        drawer.classList.add("active");
        backdrop.classList.add("active");
      }
    },

    closeDrawer: function () {
      const drawer = document.getElementById("quoteDrawer");
      const backdrop = document.getElementById("overlayBackdrop");
      if (drawer && backdrop) {
        drawer.classList.remove("active");
        backdrop.classList.remove("active");
      }
    },

    // ----------------------------------------------------
    // 7. TOAST NOTIFICATIONS
    // ----------------------------------------------------
    toast: function (message, type = "info") {
      let container = document.getElementById("siteToastContainer");
      if (!container) {
        container = document.createElement("div");
        container.id = "siteToastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
      }

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      
      let icon = "fa-circle-info";
      if (type === "success") icon = "fa-circle-check";
      if (type === "error") icon = "fa-triangle-exclamation";

      toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHtml(message)}</span>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = "toastOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    // ----------------------------------------------------
    // 8. WHATSAPP CONVERSATIONAL COMMERCE
    // ----------------------------------------------------
    openWhatsApp: function (message) {
      const number = this.getWhatsAppNumber();
      const text = encodeURIComponent(message);
      const url = `https://wa.me/${number}?text=${text}`;
      try {
        const win = window.open(url, "_blank");
        if (!win || win.closed || typeof win.closed === "undefined") {
          window.location.assign(url);
        }
      } catch (e) {
        window.location.assign(url);
      }
    },

    escapeHtml: function (str) {
      if (str == null) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    // ----------------------------------------------------
    // 7. CYBER TOP PRELOADER LASER BAR
    // ----------------------------------------------------
    startPreloader: function () {
      let loader = document.getElementById("cyberTopLoader");
      if (!loader) {
        loader = document.createElement("div");
        loader.id = "cyberTopLoader";
        loader.className = "cyber-top-loader";
        document.body.appendChild(loader);
      }
      loader.classList.add("loading");
      loader.style.width = "25%";
      if (this._preloaderTimer) clearInterval(this._preloaderTimer);
      this._preloaderTimer = setInterval(() => {
        const cur = parseFloat(loader.style.width) || 25;
        if (cur < 85) {
          loader.style.width = (cur + Math.random() * 10) + "%";
        }
      }, 200);
    },

    finishPreloader: function () {
      const loader = document.getElementById("cyberTopLoader");
      if (!loader) return;
      if (this._preloaderTimer) {
        clearInterval(this._preloaderTimer);
        this._preloaderTimer = null;
      }
      loader.style.width = "100%";
      setTimeout(() => {
        loader.classList.remove("loading");
        setTimeout(() => {
          loader.style.width = "0%";
        }, 400);
      }, 250);
    }
  };

  window.startPreloader = function() { if (window.CellCare) window.CellCare.startPreloader(); };
  window.finishPreloader = function() { if (window.CellCare) window.CellCare.finishPreloader(); };

  // Helper
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Immediately load cart from storage
  try {
    window.CellCare.loadCartFromStorage();
  } catch (e) {}

  // Auto initialize on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    window.CellCare.init();
  });

})(window, document);
