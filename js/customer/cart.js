/* cart.js - shopping cart. Part 1: the Cart store (LocalStorage, one cart per Firebase UID). Part 2: the cart page.
   LocalStorage survives refresh, closing the browser and logging out/in. SessionStorage would be wiped when the tab closes. */
const Cart = {
  key: function () { const s = Session.get(); return s ? "cart_" + s.uid : null; },
  read: function () {
    const k = Cart.key(); if (!k) return [];
    try { const a = JSON.parse(localStorage.getItem(k)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  },
  write: function (items) { const k = Cart.key(); if (!k) return; localStorage.setItem(k, JSON.stringify(items)); $(document).trigger("cart:changed"); },
  count: function () { return Cart.read().reduce(function (n, i) { return n + i.qty; }, 0); },
  total: function (items) { return (items || Cart.read()).reduce(function (t, i) { return t + i.qty * i.price; }, 0); },

  // p = product record from Firebase. Never creates duplicates: the same product only increases its quantity.
  add: function (p, qty) {
    qty = parseInt(qty, 10);
    if (!(qty >= 1)) return { ok: false, msg: "Quantity must be at least 1." };
    if (p.active !== true) return { ok: false, msg: "This product is not available." };
    if (p.quantity <= 0) return { ok: false, msg: "This product is out of stock." };
    const items = Cart.read(), line = items.filter(function (i) { return i.productId === p.id; })[0];
    const want = (line ? line.qty : 0) + qty;
    if (want > p.quantity) return { ok: false, msg: "Only " + p.quantity + " in stock" + (line ? " (you already have " + line.qty + " in your cart)." : ".") };
    if (line) { line.qty = want; line.price = p.price; }
    else items.push({ productId: p.id, title: p.title, price: p.price, imageUrl: p.imageUrl || "", catId: p.catId, qty: want });
    Cart.write(items);
    return { ok: true };
  },
  setQty: function (id, qty, stock) {
    qty = parseInt(qty, 10);
    if (!(qty >= 1)) return { ok: false, msg: "Quantity must be at least 1. Use Remove to delete the item." };
    if (qty > stock) return { ok: false, msg: "Only " + stock + " in stock." };
    const items = Cart.read();
    items.forEach(function (i) { if (i.productId === id) i.qty = qty; });
    Cart.write(items);
    return { ok: true };
  },
  remove: function (id) { Cart.write(Cart.read().filter(function (i) { return i.productId !== id; })); },
  clear: function () { Cart.write([]); },

  // Re-check the saved cart against the LATEST Firebase data (the admin may have changed stock, price or status).
  // Quantities above stock are reduced; unavailable / out-of-stock items are flagged and block checkout.
  validate: function (inv, catMap) {
    const keep = [], issues = []; let blocked = false, changed = false;
    Cart.read().forEach(function (it) {
      const p = inv ? inv[it.productId] : null, cat = catMap && p ? catMap[p.catId] : null;
      if (!p || p.active !== true || (catMap && (!cat || cat.active !== true))) {
        issues.push({ id: it.productId, type: "unavailable", msg: it.title + " is no longer available. Remove it to continue." }); blocked = true; keep.push(it); return;
      }
      if (p.quantity <= 0) { issues.push({ id: it.productId, type: "out", msg: it.title + " is out of stock. Remove it to continue." }); blocked = true; keep.push(it); return; }
      if (it.qty > p.quantity) { issues.push({ id: it.productId, type: "reduced", msg: "Only " + p.quantity + " of " + it.title + " left. Quantity reduced from " + it.qty + "." }); it.qty = p.quantity; changed = true; }
      if (it.price !== p.price) { issues.push({ id: it.productId, type: "price", msg: it.title + " price changed to " + Utils.money(p.price) + "." }); it.price = p.price; changed = true; }
      it.title = p.title; it.imageUrl = p.imageUrl || ""; it.catId = p.catId;
      keep.push(it);
    });
    if (Cart.key()) Cart.write(keep);
    return { items: keep, issues: issues, blocked: blocked, changed: changed };
  }
};

/* ---------- cart page ---------- */
$(function () {
  if (!$("#cartPage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  let inv = {}, blockedIds = {};

  function render() {
    const items = Cart.read();
    if (!items.length) {
      $("#cartLines").html('<div class="empty"><h3>Your cart is empty</h3><p class="muted">Add a product and it will stay here until you buy it.</p><a class="btn" href="products.html">Browse products</a></div>');
      $("#cartSummary").hide(); return;
    }
    let html = "", blocked = false;
    items.forEach(function (i) {
      const p = inv[i.productId], stock = p ? p.quantity : 0, bad = !!blockedIds[i.productId];
      if (bad) blocked = true;
      html += '<div class="cart-line" data-id="' + Utils.esc(i.productId) + '" data-stock="' + stock + '">' +
        '<img src="' + Utils.esc(i.imageUrl || Utils.placeholder(i.title)) + '" alt="">' +
        '<div><a href="product-details.html?id=' + encodeURIComponent(i.productId) + '">' + Utils.esc(i.title) + "</a><div class='muted'>" + Utils.money(i.price) + " each" + (bad ? "" : " &middot; " + stock + " in stock") + "</div>" +
        (bad ? '<div class="warn-note">' + Utils.esc(blockedIds[i.productId]) + "</div>" : "") + "</div>" +
        '<div class="qty"><button type="button" data-dec ' + (bad ? "disabled" : "") + ' aria-label="Decrease">&minus;</button><input type="number" min="1" max="' + stock + '" value="' + i.qty + '" data-qty ' + (bad ? "disabled" : "") + ' aria-label="Quantity"><button type="button" data-inc ' + (bad ? "disabled" : "") + ' aria-label="Increase">+</button></div>' +
        '<div class="cl-sub">' + Utils.money(i.qty * i.price) + '</div><button type="button" class="link-danger" data-rm>Remove</button></div>';
    });
    $("#cartLines").html(html);
    $("#cartSummary").show().html('<h3>Order total</h3><div class="sum-row"><span>Items</span><span>' + Cart.count() + '</span></div><div class="sum-row total"><span>Grand total</span><span>' + Utils.money(Cart.total(items)) + "</span></div>" +
      '<a class="btn btn-block' + (blocked ? " disabled" : "") + '" href="checkout.html" style="margin-top:12px">Go to checkout</a>' + (blocked ? '<p class="warn-note">Remove the unavailable items to continue.</p>' : ""));
  }

  function change(id, qty, stock) { const r = Cart.setQty(id, qty, stock); if (!r.ok) Utils.toast(r.msg, "error"); render(); }

  $("#cartLines").on("click", "[data-inc]", function () { const $l = $(this).closest(".cart-line"); change($l.data("id"), parseInt($l.find("[data-qty]").val(), 10) + 1, $l.data("stock")); });
  $("#cartLines").on("click", "[data-dec]", function () { const $l = $(this).closest(".cart-line"); change($l.data("id"), parseInt($l.find("[data-qty]").val(), 10) - 1, $l.data("stock")); });
  $("#cartLines").on("change", "[data-qty]", function () { const $l = $(this).closest(".cart-line"); change($l.data("id"), $(this).val(), $l.data("stock")); });
  $("#cartLines").on("click", "[data-rm]", function () { Cart.remove($(this).closest(".cart-line").data("id")); Utils.toast("Item removed", "info"); render(); });

  $.when(DB.get("inventory"), DB.get("categories")).done(function (i, c) {
    try {
      inv = {};
      Utils.list(i).forEach(function (product) { inv[product.id] = DemoStore.applyStock(product); });
      const catMap = c || {};
      const r = Cart.validate(inv, catMap);
      r.issues.forEach(function (x) { if (x.type === "unavailable" || x.type === "out") blockedIds[x.id] = x.msg; });
      const notes = r.issues.filter(function (x) { return x.type === "reduced" || x.type === "price"; });
      $("#cartIssues").html(notes.map(function (x) { return '<div class="message info">' + Utils.esc(x.msg) + "</div>"; }).join(""));
      render();
    } catch (error) {
      $("#cartLines").html('<div class="message error">' + Utils.esc(error.message) + "</div>");
      Utils.toast(error.message, "error");
    }
  }).fail(function (e) { $("#cartLines").html('<div class="message error">' + Utils.esc(AuthAPI.friendlyError(e)) + "</div>"); });
});
