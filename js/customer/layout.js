/* layout.js - builds the shared header and footer on every storefront page (so the HTML is not repeated in each file) */
$(function () {
  if (!$("body").hasClass("shop")) return;
  const s = Session.get(), admin = Session.isAdmin();
  let account;
  if (s) {
    account = '<div class="acct"><button class="acct-btn" id="acctBtn" type="button">Hi, <span id="acctName">' + Utils.esc(s.email.split("@")[0]) + '</span></button><div class="acct-menu" id="acctMenu">' +
      (admin ? '<a href="../admin/dashboard.html">Admin dashboard</a>' : '<a href="profile.html">My profile</a><a href="orders.html">My orders</a>') + '<a href="#" id="logoutLink">Log out</a></div></div>';
  } else {
    account = '<a class="nav-link" href="login.html">Log in</a><a class="btn btn-probe btn-sm" href="register.html">Sign up</a>';
  }
  $("#app-header").html('<header class="topbar"><div class="container bar"><a class="brand" href="home.html"><span class="brand-mark">OS</span>Online Shopping</a>' +
    '<form class="nav-search" id="navSearch"><input id="navQ" type="search" placeholder="Search products by name or ID" aria-label="Search"><button type="submit">Search</button></form>' +
    '<nav class="nav-links"><a class="nav-link" href="wishlist.html">Wishlist</a><a class="nav-link" href="cart.html">Cart<span class="count" id="cartCount">0</span></a>' + account + '</nav></div>' +
    '<div class="container catbar" id="catBar"><a href="products.html">All products</a></div></header>');
  $("#app-footer").html('<footer class="footer"><div class="container foot-in"><div><strong>Online Shopping</strong><br>Phones, laptops and accessories. Prices in rupees.</div>' +
    '<div><a href="products.html">Products</a> &nbsp; <a href="cart.html">Cart</a> &nbsp; <a href="orders.html">Orders</a></div></div></footer>');

  function count() { $("#cartCount").text(Cart.count()); }
  count(); $(document).on("cart:changed", count);

  $("#navSearch").on("submit", function (e) { e.preventDefault(); location.href = "products.html?q=" + encodeURIComponent($.trim($("#navQ").val())); });
  $("#acctBtn").on("click", function (e) { e.stopPropagation(); $("#acctMenu").toggleClass("open"); });
  $(document).on("click", function () { $("#acctMenu").removeClass("open"); });
  $("#logoutLink").on("click", function (e) { e.preventDefault(); Guard.logout("login.html"); });

  if (s && !admin) DB.get("customers/" + s.uid + "/name").done(function (n) { if (n) $("#acctName").text(n.split(" ")[0]); });
  const cur = Utils.param("cat");
  DB.get("categories").done(function (c) {
    Utils.list(c).filter(function (x) { return x.active; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (x) {
      $("#catBar").append('<a href="products.html?cat=' + encodeURIComponent(x.id) + '"' + (cur === x.id ? ' class="on"' : "") + ">" + Utils.esc(x.name) + "</a>");
    });
  });
});
