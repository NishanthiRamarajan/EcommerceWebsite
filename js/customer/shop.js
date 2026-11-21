/* shop.js - shared storefront helpers: load the catalogue, draw product cards, add to cart, toggle favourite. */
const Shop = {
  products: [], map: {}, cats: [], catMap: {},

  // Customers only see ACTIVE products in ACTIVE categories. Out-of-stock products stay visible but cannot be bought.
  load: function () {
    return $.when(DB.get("inventory"), DB.get("categories")).then(function (inv, cats) {
      Shop.catMap = {}; Utils.list(cats).forEach(function (c) { Shop.catMap[c.id] = c; });
      Shop.cats = Utils.list(cats).filter(function (c) { return c.active; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      Shop.products = Utils.list(inv).filter(function (p) {
        return p.active === true && Shop.catMap[p.catId] && Shop.catMap[p.catId].active;
      }).map(function (product) {
        return DemoStore.applyStock(product);
      });
      Shop.map = {}; Shop.products.forEach(function (p) { Shop.map[p.id] = p; });
      return Shop.products;
    });
  },

  card: function (p) {
    const out = p.quantity <= 0, id = Utils.esc(p.id), link = "product-details.html?id=" + encodeURIComponent(p.id);
    return '<article class="card"><a class="card-img" href="' + link + '"><img loading="lazy" src="' + Utils.img(p) + '" alt="' + Utils.esc(p.title) + '"></a>' +
      '<button type="button" class="fav' + (Wishlist.has(p.id) ? " on" : "") + '" data-fav="' + id + '" aria-label="Favourite">&#9829;</button>' +
      '<div class="card-body"><a class="card-title" href="' + link + '">' + Utils.esc(p.title) + "</a>" +
      '<div class="card-row"><span class="price">' + Utils.money(p.price) + "</span>" + Utils.stockBadge(p.quantity, p.active) + "</div>" +
      '<button type="button" class="btn btn-block" data-add="' + id + '"' + (out ? " disabled" : "") + ">" + (out ? "Out of stock" : "Add to cart") + "</button></div></article>";
  },

  section: function (title, list, extra) {
    if (!list.length) return "";
    return '<div class="section-head"><h2>' + Utils.esc(title) + "</h2>" + (extra || "") + '</div><div class="cards">' + list.map(Shop.card).join("") + "</div>";
  },

  bind: function ($root) {
    $root.on("click", "[data-add]", function () { Shop.add($(this).attr("data-add"), 1); });
    $root.on("click", "[data-fav]", function () { Shop.fav($(this).attr("data-fav"), $(this)); });
  },

  add: function (id, qty) {
    if (!Guard.requireLogin("login.html")) return;
    if (Session.isAdmin()) { Utils.toast("Admin accounts cannot shop. Use a customer account.", "error"); return; }
    const p = Shop.map[id]; if (!p) { Utils.toast("Product not found.", "error"); return; }
    const r = Cart.add(p, qty);
    Utils.toast(r.ok ? p.title + " added to cart" : r.msg, r.ok ? "success" : "error");
  },

  fav: function (id, $btn) {
    if (!Guard.requireLogin("login.html")) return;
    Wishlist.toggle(id).done(function (on) {
      $btn.toggleClass("on", on);
      Utils.toast(on ? "Saved to your wishlist" : "Removed from your wishlist", "success");
      $(document).trigger("wish:changed", [id, on]);
    }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
  }
};
