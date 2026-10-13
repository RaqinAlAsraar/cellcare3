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

    svg: {
      lightning: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      whatsapp: '<svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      trash: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      cart: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
      info: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
      check: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      xmark: '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      arrowRight: '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
      expand: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
      boxes: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      shield: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      truck: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'
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
            <div style="text-align:center; padding: 48px 16px; color: var(--text-muted);">
              <div style="font-size: 2rem; opacity: 0.35; margin-bottom: 12px;">${this.svg.cart}</div>
              <p style="font-weight: 600; font-size: 0.9rem; color: #ffffff;">Quote cart is empty.</p>
              <p style="font-size: 0.8rem; margin: 4px 0 16px 0;">Add items from our catalog to review pricing.</p>
              <a href="products.html" class="btn btn-outline btn-sm">Browse Products</a>
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
                  ${this.svg.trash}
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
      
      let iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      if (type === "success") {
        iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else if (type === "error") {
        iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      }

      toast.innerHTML = `
        ${iconSvg}
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
