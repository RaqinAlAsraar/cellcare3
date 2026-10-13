/**
 * CELL CARE INDIA — DIRECT WHATSAPP CONTACT BINDING (v3.0)
 * Binds inquiries directly to WhatsApp with concurrent backend logging.
 */

(function () {
  "use strict";

  function bootContact() {
    initContactForm();
    initQuickConnectButtons();
    initPresetChips();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootContact);
  } else {
    bootContact();
  }

  function initContactForm() {
    const form = document.getElementById("directContactForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("contactName").value.trim();
      const phone = document.getElementById("contactPhone").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const category = document.getElementById("contactCategory").value;
      const message = document.getElementById("contactMessage").value.trim();

      if (!name || !phone || !message) {
        window.CellCare.toast("Please fill in your Name, Phone, and Message.", "error");
        return;
      }

      // Build clean minimal WhatsApp message
      let waText = `*Inquiry — Cell Care India*\n\n`;
      waText += `*Name:* ${name}\n`;
      waText += `*Phone:* ${phone}\n`;
      if (email) waText += `*Email:* ${email}\n`;
      if (category) waText += `*Topic:* ${category}\n`;
      waText += `\n*Message:*\n${message}`;

      // 1. Direct WhatsApp Dispatch (Primary channel)
      if (window.CellCare && typeof window.CellCare.openWhatsApp === "function") {
        window.CellCare.openWhatsApp(waText);
        window.CellCare.toast("Connecting to WhatsApp...", "success");
      } else {
        const url = `https://wa.me/918505910581?text=${encodeURIComponent(waText)}`;
        window.location.href = url;
      }

      form.reset();
    });
  }

  function initQuickConnectButtons() {
    // Sales button
    const salesBtn = document.getElementById("quickConnectSales");
    if (salesBtn) {
      salesBtn.addEventListener("click", () => {
        window.CellCare.openWhatsApp("Hello Cell Care India! I want to inquire about wholesale battery pricing.");
      });
    }

    // Technical / Custom Packs
    const techBtn = document.getElementById("quickConnectTech");
    if (techBtn) {
      techBtn.addEventListener("click", () => {
        window.CellCare.openWhatsApp("Hello Cell Care India! I need consultation for a custom battery pack.");
      });
    }

    // Dealership
    const dealerBtn = document.getElementById("dealerConnectDealer");
    const dealerAlt = document.getElementById("quickConnectDealer");
    const targetDealerBtn = dealerBtn || dealerAlt;
    if (targetDealerBtn) {
      targetDealerBtn.addEventListener("click", () => {
        window.CellCare.openWhatsApp("Hello Cell Care India! I am interested in dealership / distribution opportunities.");
      });
    }
  }

  function initPresetChips() {
    const chipsContainer = document.getElementById("contactPresetChips");
    if (!chipsContainer) return;

    const chips = chipsContainer.querySelectorAll(".preset-chip");
    const msgTextarea = document.getElementById("contactMessage");
    const categorySelect = document.getElementById("contactCategory");

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const msg = chip.dataset.msg;
        const cat = chip.dataset.category;
        if (msg && msgTextarea) {
          msgTextarea.value = msg;
          msgTextarea.focus();
        }
        if (cat && categorySelect) {
          categorySelect.value = cat;
        }
        if (window.CellCare) {
          window.CellCare.toast("Inquiry preset applied!", "info");
        }
      });
    });
  }

})();
