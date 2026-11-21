/* home.js - hero search, category chips, featured / trending / recently added / favourites / recently viewed */
$(function () {
  if (!$("#sections").length) return;
  $("#heroSearch").on("submit", function (e) { e.preventDefault(); location.href = "products.html?q=" + encodeURIComponent($.trim($("#heroQ").val())); });
  Shop.bind($("#sections"));

  function draw() {
    $("#catTiles").html(Shop.cats.map(function (c) { return '<a class="chip" href="products.html?cat=' + encodeURIComponent(c.id) + '">' + Utils.esc(c.name) + "</a>"; }).join(""));
    const P = Shop.products;
    const featured = P.filter(function (p) { return p.featured === true; }).slice(0, 4);
    const trending = P.filter(function (p) { return (p.soldCount || 0) > 0; }).sort(function (a, b) { return b.soldCount - a.soldCount; }).slice(0, 4);
    const added = P.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 8);
    const favs = P.filter(function (p) { return Wishlist.has(p.id); }).slice(0, 4);
    const viewed = Recent.list().map(function (id) { return Shop.map[id]; }).filter(Boolean).slice(0, 4);
    let html = Shop.section("Featured products", featured) + Shop.section("Trending now", trending) + Shop.section("Recently added", added);
    if (Session.isLoggedIn()) html += Shop.section("Your favourites", favs, '<a href="wishlist.html">See all</a>');
    html += Shop.section("Recently viewed", viewed);
    $("#sections").html(html || '<div class="empty"><h3>No products yet</h3><p class="muted">The store has not added any products. Check back soon.</p></div>');
  }
  // Favourites show instantly from the cookie, then Firebase confirms them.
  Shop.load().done(function () { draw(); if (Session.isLoggedIn()) Wishlist.sync().done(draw); }).fail(function (e) { $("#sections").html('<div class="message error">' + Utils.esc(AuthAPI.friendlyError(e)) + "</div>"); });
  $(document).on("wish:changed", draw);
});
