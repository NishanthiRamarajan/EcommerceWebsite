/* admin-layout.js - guards admin pages and builds the sidebar + top bar */
$(function () {
  if (!$("body").hasClass("admin")) return;
  if (!Guard.requireAdmin("login.html")) return;
  const page = $("body").data("page");
  const nav = [["dashboard", "Dashboard"], ["categories", "Category Management"], ["inventory", "Inventory Management"], ["customers", "Customer Management"], ["orders", "Order Management"],
    ["g", "Reports"], ["reports-customers", "Customer Reports"], ["reports-inventory", "Inventory Reports"], ["reports-sales", "Sales Reports"]];
  let html = '<a class="brand" href="dashboard.html"><span class="brand-mark" style="background:var(--probe);color:var(--ink);width:28px;height:28px;display:grid;place-items:center;border-radius:6px;font-size:.85rem">OS</span>Admin</a>';
  nav.forEach(function (n) { html += n[0] === "g" ? '<div class="group">' + n[1] + "</div>" : '<a class="nav' + (n[0] === page ? " on" : "") + '" href="' + n[0] + '.html">' + n[1] + "</a>"; });
  html += '<div class="group">Account</div><a class="nav" href="../customer/home.html">View storefront</a><a class="nav" href="#" id="logoutLink">Logout</a>';
  $("#sidebar").html(html);
  $("#topbar").html('<button class="btn btn-ghost btn-sm" id="menuBtn" type="button">Menu</button><strong id="pageTitle"></strong><span class="who">' + Utils.esc(Session.get().email) + "</span>");
  $("#pageTitle").text($("h1").first().text());
  $("#menuBtn").on("click", function () { $("#sidebar").toggleClass("open"); });
  $("#logoutLink").on("click", function (e) { e.preventDefault(); Guard.logout("login.html"); });
});
