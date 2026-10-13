/**
 * CELL CARE INDIA — MINIMAL CHECKOUT & WHATSAPP DISPATCHER (v3.0)
 * Streamlined form, itemized quotation list, and reliable WhatsApp dispatch.
 */

(function () {
  "use strict";

  function bootCheckout() {
    if (window.CellCare && typeof window.CellCare.loadCartFromStorage === "function") {
      window.CellCare.loadCartFromStorage();
    }
    renderCheckoutSummary();
    initCheckoutForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCheckout);
  } else {
    bootCheckout();
  }

  window.removeCheckoutItem = function (id) {
    if (window.CellCare) {
      window.CellCare.removeFromCart(id);
      renderCheckoutSummary();
    }
  };

  function renderCheckoutSummary() {
    const listContainer = document.getElementById("checkoutItemList");
    const totalEl = document.getElementById("checkoutTotalVal");
    const submitBtn = document.getElementById("checkoutSubmitBtn");

    if (!listContainer || !window.CellCare) return;

    const items = Object.values(window.CellCare.cart || {});

    const svg = (window.CellCare && window.CellCare.svg) || {};

    if (!items.length) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding: 24px 10px; color: var(--text-muted);">
          <p style="font-size: 0.9rem; margin-bottom: 12px;">Your quote cart is currently empty.</p>
          <a href="products.html" class="btn btn-outline btn-sm">Browse Products</a>
        </div>
      `;
      if (totalEl) totalEl.textContent = "₹0";
      if (submitBtn) {
        submitBtn.innerHTML = `${svg.whatsapp || ""} Send Inquiry to WhatsApp`;
        submitBtn.disabled = false;
      }
      return;
    }

    if (submitBtn) {
      submitBtn.innerHTML = `${svg.whatsapp || ""} Send Order to WhatsApp`;
      submitBtn.disabled = false;
    }

    let subtotal = 0;

    listContainer.innerHTML = items.map(item => {
      const lineTotal = item.qty * (item.price || 0);
      subtotal += lineTotal;
      const safeId = String(item.id || item.slug || item.title).replace(/'/g, "\\'");

      return `
        <div class="order-item-card">
          <img src="${item.image_url || 'assets/images/hero.svg'}" class="order-item-thumb" alt="${escapeHtml(item.title)}" />
          <div class="order-item-details">
            <div class="order-item-title">${escapeHtml(item.title)}</div>
            <div class="order-item-pricing">
              ${item.qty} units × ${item.price ? `₹${item.price.toLocaleString("en-IN")}` : "Quote"}
            </div>
          </div>
          <div class="order-item-total">
            ${lineTotal > 0 ? `₹${lineTotal.toLocaleString("en-IN")}` : "Quote"}
          </div>
          <button type="button" class="order-item-remove-btn" onclick="removeCheckoutItem('${safeId}')" title="Remove item">
            ${svg.xmark || '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'}
          </button>
        </div>
      `;
    }).join("");

    const formatted = subtotal > 0 ? `₹${subtotal.toLocaleString("en-IN")}` : "Contact for Quote";
    if (totalEl) totalEl.textContent = formatted;
  }

  function initCheckoutForm() {
    const form = document.getElementById("checkoutOrderForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (document.getElementById("custName")?.value || "").trim();
      const phoneRaw = (document.getElementById("custPhone")?.value || "").trim();
      const address = (document.getElementById("custAddress")?.value || "").trim();
      const notes = (document.getElementById("custNotes")?.value || "").trim();

      if (!name) {
        window.CellCare.toast("Please enter your name.", "error");
        document.getElementById("custName")?.focus();
        return;
      }

      const phoneDigits = phoneRaw.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        window.CellCare.toast("Please enter a valid 10-digit mobile number.", "error");
        document.getElementById("custPhone")?.focus();
        return;
      }
      const cleanPhone = phoneDigits.slice(-10);

      const items = Object.values(window.CellCare.cart || {});

      // Build clean minimal WhatsApp message
      let msg = `*Order Inquiry — Cell Care India*\n\n`;
      msg += `*Name:* ${name}\n`;
      msg += `*Phone:* ${cleanPhone}\n`;
      if (address) msg += `*Address:* ${address}\n`;
      if (notes) msg += `*Notes:* ${notes}\n`;

      if (items.length > 0) {
        let subtotal = 0;
        msg += `\n*Selected Items:*\n`;
        items.forEach((item, index) => {
          const lineTotal = item.qty * (item.price || 0);
          subtotal += lineTotal;
          const priceText = lineTotal > 0 ? `₹${lineTotal.toLocaleString("en-IN")}` : "Quote";
          msg += `• ${item.title} — ${item.qty} units (${priceText})\n`;
        });
        if (subtotal > 0) {
          msg += `\n*Estimated Total:* ₹${subtotal.toLocaleString("en-IN")}`;
        }
      } else if (!notes) {
        msg += `\n*Requirements:* Looking for battery pack / components quotation.`;
      }

      // Open WhatsApp directly
      if (window.CellCare && typeof window.CellCare.openWhatsApp === "function") {
        window.CellCare.openWhatsApp(msg);
        window.CellCare.toast("Connecting to WhatsApp...", "success");
      } else {
        const text = encodeURIComponent(msg);
        const url = `https://wa.me/918505910581?text=${text}`;
        window.location.href = url;
      }
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

})();
