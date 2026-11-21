/* product-details.js - one product, quantity picker, add to cart, favourite, recently viewed (cookie) */
$(function () {
  if (!$("#detail").length) return;
  const id = Utils.param("id");
  if (!id) { $("#detail").html('<div class="empty"><h3>No product selected</h3><a class="btn" href="products.html">Browse products</a></div>'); return; }

  Shop.load().done(function () {
    const p = Shop.map[id];
    if (!p) { $("#detail").html('<div class="empty"><h3>Product not available</h3><p class="muted">It may be inactive or removed.</p><a class="btn" href="products.html">Browse products</a></div>'); return; }
    Recent.add(p.id);
    const out = p.quantity <= 0, cat = Shop.catMap[p.catId];
    $("#detail").html('<img src="' + Utils.img(p) + '" alt="' + Utils.esc(p.title) + '"><div><p class="muted">' + Utils.esc(cat ? cat.name : "") + " &middot; ID " + Utils.esc(p.id) + "</p><h1>" + Utils.esc(p.title) + "</h1>" +
      '<div class="price">' + Utils.money(p.price) + "</div><p>" + Utils.stockBadge(p.quantity, p.active) + '</p><p style="white-space:pre-line">' + Utils.esc(p.description || "") + "</p>" +
      '<div class="buy-row"><div class="qty"><button type="button" id="qMinus" aria-label="Decrease">&minus;</button><input id="qVal" type="number" min="1" max="' + Math.max(1, p.quantity) + '" value="1"' + (out ? " disabled" : "") + '><button type="button" id="qPlus" aria-label="Increase">+</button></div>' +
      '<button type="button" class="btn" id="addBtn"' + (out ? " disabled" : "") + ">" + (out ? "Out of stock" : "Add to cart") + '</button><button type="button" class="btn btn-ghost" id="favBtn">' + (Wishlist.has(p.id) ? "Remove from wishlist" : "Add to wishlist") + "</button></div></div>");
    function setQ(v) { v = parseInt(v, 10); if (!(v >= 1)) v = 1; if (v > p.quantity) { v = p.quantity; Utils.toast("Only " + p.quantity + " in stock.", "error"); } $("#qVal").val(v); }
    $("#qMinus").on("click", function () { setQ(parseInt($("#qVal").val(), 10) - 1); });
    $("#qPlus").on("click", function () { setQ(parseInt($("#qVal").val(), 10) + 1); });
    $("#qVal").on("change", function () { setQ($(this).val()); });
    $("#addBtn").on("click", function () { Shop.add(p.id, parseInt($("#qVal").val(), 10)); });
    $("#favBtn").on("click", function () {
      if (!Guard.requireLogin("login.html")) return;
      Wishlist.toggle(p.id).done(function (on) { $("#favBtn").text(on ? "Remove from wishlist" : "Add to wishlist"); Utils.toast(on ? "Saved to your wishlist" : "Removed from your wishlist", "success"); });
    });
    const rel = Shop.products.filter(function (x) { return x.catId === p.catId && x.id !== p.id; }).slice(0, 4);
    if (rel.length) { $("#related").html(rel.map(Shop.card).join("")); $("#relatedWrap").removeClass("hidden"); Shop.bind($("#related")); }
  }).fail(function (e) { $("#detail").html('<div class="message error">' + Utils.esc(AuthAPI.friendlyError(e)) + "</div>"); });
  if (Session.isLoggedIn()) Wishlist.sync();
});
