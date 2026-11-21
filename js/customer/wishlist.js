/* wishlist.js - favourites. Firebase (wishlists/<uid>) is the permanent, account-level copy.
   A small cookie (fav_<uid>) mirrors the IDs so hearts and the home page can show favourites instantly. */
const Wishlist = {
  mem: null,
  ckey: function () { const s = Session.get(); return s ? "fav_" + s.uid : "fav_guest"; },
  ids: function () { return Cookies.getJSON(Wishlist.ckey(), []); },
  has: function (id) { return Wishlist.mem ? Wishlist.mem.indexOf(id) > -1 : Wishlist.ids().indexOf(id) > -1; },
  _save: function (ids) { Wishlist.mem = ids; Cookies.set(Wishlist.ckey(), JSON.stringify(ids.slice(0, 40)), 180); },
  sync: function () {   // Firebase -> memory + cookie
    const s = Session.get(); if (!s) return $.Deferred().resolve([]).promise();
    return DB.get("wishlists/" + s.uid).then(function (obj) { const ids = Object.keys(obj || {}); Wishlist._save(ids); return ids; });
  },
  toggle: function (id) {   // resolves with the new state (true = now a favourite)
    const s = Session.get(), had = Wishlist.has(id);
    const req = had ? DB.remove("wishlists/" + s.uid + "/" + id) : DB.put("wishlists/" + s.uid + "/" + id, true);
    return req.then(function () {
      let ids = (Wishlist.mem || Wishlist.ids()).filter(function (x) { return x !== id; });
      if (!had) ids.push(id);
      Wishlist._save(ids);
      return !had;
    });
  }
};

$(function () {
  if (!$("#wishlistPage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  const pg = new Paginator({
    container: "#pager", perPage: Prefs.get("pp", 8), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) { $("#grid").html(items.map(function (p) { return Shop.card(p); }).join("")); }
  });
  function draw() {
    const list = Shop.products.filter(function (p) { return Wishlist.has(p.id); });
    $("#grid").toggleClass("hidden", !list.length);
    $("#emptyWish").toggleClass("hidden", !!list.length);
    pg.setItems(list, true);
  }
  Shop.bind($("#grid"));
  $(document).on("wish:changed", draw);
  $.when(Wishlist.sync(), Shop.load()).done(draw).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
});
