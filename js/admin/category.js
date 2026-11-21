/* category.js - Category CRUD: create, read, update, activate/deactivate, delete (blocked while products use the category) */
$(function () {
  if (!$("#catRows").length || !Session.isAdmin()) return;
  let cats = [], editing = null;
  const pg = new Paginator({ container: "#pager", perPage: Prefs.get("pp", 10), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#catRows").html(items.length ? items.map(function (c) {
        return "<tr><td>" + Utils.esc(c.id) + "</td><td>" + Utils.esc(c.name) + "</td><td>" + (c.active ? '<span class="badge st-delivered">Active</span>' : '<span class="badge st-cancelled">Inactive</span>') +
          '</td><td class="acts"><button class="btn btn-sm" data-act="edit" data-id="' + Utils.esc(c.id) + '">Edit</button><button class="btn btn-sm btn-ghost" data-act="toggle" data-id="' + Utils.esc(c.id) + '">' + (c.active ? "Deactivate" : "Activate") +
          '</button><button class="btn btn-sm btn-danger" data-act="del" data-id="' + Utils.esc(c.id) + '">Delete</button></td></tr>';
      }).join("") : '<tr><td colspan="4" class="muted">No categories yet. Add the first one.</td></tr>');
    } });
  function load() { DB.get("categories").done(function (o) { cats = Utils.list(o).sort(function (a, b) { return a.name.localeCompare(b.name); }); pg.setItems(cats, true); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); }); }
  function find(id) { return cats.filter(function (c) { return c.id === id; })[0]; }

  $("#addCat").on("click", function () { editing = null; $("#catForm")[0].reset(); $("#cId").prop("readonly", false); $("#catTitle").text("Add category"); Utils.showFieldErrors({}, "#catForm"); Utils.openModal("catModal"); });
  $("#catRows").on("click", "[data-act]", function () {
    const id = $(this).attr("data-id"), c = find(id), act = $(this).attr("data-act");
    if (act === "edit") { editing = c; $("#cId").val(c.id).prop("readonly", true); $("#cName").val(c.name); $("#catTitle").text("Edit category"); Utils.showFieldErrors({}, "#catForm"); Utils.openModal("catModal"); }
    if (act === "toggle") DB.patch("categories/" + id, { active: !c.active }).done(function () { Utils.toast(c.active ? "Category deactivated" : "Category activated", "success"); load(); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
    if (act === "del") {
      DB.query("inventory", { orderBy: "catId", equalTo: id, limitToFirst: 1 }).done(function (used) {
        if (used && Object.keys(used).length) { Utils.toast("This category still has products. Move or delete them first, or deactivate the category.", "error"); return; }
        Utils.confirm('Delete category "' + c.name + '" permanently?').then(function (yes) {
          if (yes) DB.remove("categories/" + id).done(function () { Utils.toast("Category deleted", "success"); load(); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
        });
      }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
    }
  });
  $("#catForm").on("submit", function (e) {
    e.preventDefault();
    const d = { id: $.trim($("#cId").val()), name: $.trim($("#cName").val()) };
    const errors = Validate.category(d, { isEdit: !!editing, existingIds: cats.map(function (c) { return c.id; }) });
    Utils.showFieldErrors(errors, "#catForm");
    if (!$.isEmptyObject(errors)) return;
    const req = editing ? DB.patch("categories/" + editing.id, { name: d.name }) : DB.put("categories/" + d.id, { id: d.id, name: d.name, active: true });
    req.done(function () { Utils.closeModal("catModal"); Utils.toast("Category saved", "success"); load(); }).fail(function (x) { Utils.toast(AuthAPI.friendlyError(x), "error"); });
  });
  load();
});
