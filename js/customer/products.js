/* products.js - search all / by category / specific product (name or ID), sort, pagination */
$(function () {
  if (!$("#grid").length || !$("#fQ").length) return;
  const pg = new Paginator({
    container: "#pager", perPage: Prefs.get("pp", 8), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#grid").html(items.length ? items.map(function (p) { return Shop.card(p); }).join("") : '<div class="empty" style="grid-column:1/-1"><h3>No products match</h3><p class="muted">Try another word or clear the filters.</p><button class="btn" id="clearF" type="button">Clear filters</button></div>');
    }
  });
  Shop.bind($("#grid"));
  $("#grid").on("click", "#clearF", function () { $("#fQ").val(""); $("#fCat").val(""); apply(); });

  function apply() {
    const q = $.trim($("#fQ").val()).toLowerCase(), cat = $("#fCat").val(), sort = $("#fSort").val();
    let list = Shop.products.filter(function (p) {
      return (!cat || p.catId === cat) && (!q || p.title.toLowerCase().indexOf(q) > -1 || p.id.toLowerCase().indexOf(q) > -1 || (p.description || "").toLowerCase().indexOf(q) > -1);
    });
    const by = { new: function (a, b) { return b.createdAt - a.createdAt; }, plow: function (a, b) { return a.price - b.price; }, phigh: function (a, b) { return b.price - a.price; }, name: function (a, b) { return a.title.localeCompare(b.title); } };
    list.sort(by[sort] || by.new);
    $("#resultInfo").text(list.length + " product" + (list.length === 1 ? "" : "s") + " found");
    pg.setItems(list);
  }

  Shop.load().done(function () {
    Shop.cats.forEach(function (c) { $("#fCat").append('<option value="' + Utils.esc(c.id) + '">' + Utils.esc(c.name) + "</option>"); });
    $("#fQ").val(Utils.param("q") || ""); $("#fCat").val(Utils.param("cat") || ""); $("#fSort").val(Prefs.get("sort", "new"));
    apply();
  }).fail(function (e) { $("#grid").html('<div class="message error">' + Utils.esc(AuthAPI.friendlyError(e)) + "</div>"); });

  $("#fQ").on("input", Utils.debounce(apply, 250));
  $("#fCat").on("change", apply);
  $("#fSort").on("change", function () { Prefs.set("sort", $(this).val()); apply(); });
});
