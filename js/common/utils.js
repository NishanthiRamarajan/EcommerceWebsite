/* utils.js - small helpers used on every page */
const APP = {
  LOW_STOCK: 15,        // quantity < 15  => low stock
  HIGH_STOCK: 100,      // quantity > 100 => high stock
  PAGE_SIZES: [5, 10, 20, 50],
  STATUSES: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
  NEXT: { pending: ["confirmed", "cancelled"], confirmed: ["shipped", "cancelled"], shipped: ["delivered"], delivered: [], cancelled: [] }
};

const Utils = {
  // Always escape user-supplied text before putting it into HTML (prevents XSS).
  esc: function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  },
  money: function (n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); },   // whole rupees only
  date: function (t) { return new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); },
  dateTime: function (t) { return new Date(t).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); },
  list: function (obj) { return obj ? Object.keys(obj).map(function (k) { return obj[k]; }) : []; },
  // { uid: { orderId: order } }  ->  [order, order, ...]
  flattenOrders: function (all) {
    const out = [];
    Object.keys(all || {}).forEach(function (uid) { Utils.list(all[uid]).forEach(function (o) { out.push(o); }); });
    return out;
  },
  debounce: function (fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); }; },
  param: function (name) { return new URLSearchParams(location.search).get(name); },
  newId: function (prefix) { return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); },
  // After login, only allow redirects to a page of this site (blocks open-redirect tricks).
  safeNext: function () { const n = Utils.param("next"); return n && /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_=&%.-]*)?$/.test(n) ? n : null; },
  // Date range helpers. Inputs are "YYYY-MM-DD" strings; the end date is inclusive.
  dayStart: function (v) { return v ? new Date(v + "T00:00:00").getTime() : -Infinity; },
  dayEnd: function (v) { return v ? new Date(v + "T23:59:59.999").getTime() : Infinity; },

  showMessage: function (sel, text, type) { $(sel).removeClass("error success info").addClass(type || "info").text(text); },
  clearMessage: function (sel) { $(sel).removeClass("error success info").text(""); },
  showFieldErrors: function (errors, scope) {
    const $s = scope ? $(scope) : $(document);
    $s.find(".field-error").text("");
    for (const f in errors) { $s.find('.field-error[data-for="' + f + '"]').text(errors[f]); }
  },
  setLoading: function ($btn, on, text) { $btn.prop("disabled", on).text(text); },

  toast: function (msg, type) {
    let $box = $("#toasts");
    if (!$box.length) $box = $('<div id="toasts" aria-live="polite"></div>').appendTo("body");
    const $t = $('<div class="toast"></div>').addClass(type || "info").text(msg).appendTo($box);
    setTimeout(function () { $t.fadeOut(300, function () { $t.remove(); }); }, 3500);
  },

  openModal: function (id) { $("#" + id).addClass("open"); },
  closeModal: function (id) { $("#" + id).removeClass("open"); },

  // Yes / No confirmation. Resolves true or false.  Utils.confirm("Delete?").then(function(yes){ ... })
  confirm: function (message) {
    return new Promise(function (resolve) {
      const $m = $('<div class="modal open"><div class="modal-box small"><h3>Please confirm</h3><p class="confirm-text"></p>' +
        '<div class="modal-actions"><button class="btn btn-ghost" data-r="no" type="button">No</button><button class="btn btn-danger" data-r="yes" type="button">Yes</button></div></div></div>');
      $m.find(".confirm-text").text(message);
      $m.on("click", "[data-r]", function () { const yes = $(this).data("r") === "yes"; $m.remove(); resolve(yes); });
      $("body").append($m);
    });
  },

  // Product with no image: draw initials on a plain tile (no external image needed).
  placeholder: function (text) {
    const t = String(text || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#dfe7e3'/><text x='50%' y='57%' font-family='Arial' font-size='72' font-weight='700' fill='#8fa399' text-anchor='middle'>" + t + "</text></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  },
  img: function (p) { return Utils.esc(p.imageUrl || Utils.placeholder(p.title)); },

  stockBadge: function (qty, active) {
    if (active === false) return '<span class="badge st-cancelled">Unavailable</span>';
    if (qty <= 0) return '<span class="badge st-cancelled">Out of stock</span>';
    if (qty < APP.LOW_STOCK) return '<span class="badge st-pending">Only ' + qty + ' left</span>';
    return '<span class="badge st-delivered">In stock</span>';
  },
  statusBadge: function (st) { return '<span class="badge st-' + Utils.esc(st) + '">' + Utils.esc(st.charAt(0).toUpperCase() + st.slice(1)) + "</span>"; }
};

// Modal close buttons, backdrop click and the Esc key.
$(document).on("click", "[data-close]", function () { $(this).closest(".modal").removeClass("open"); });
$(document).on("click", ".modal", function (e) { if (e.target === this) $(this).removeClass("open"); });
$(document).on("keydown", function (e) { if (e.key === "Escape") $(".modal.open").last().removeClass("open"); });
