guard("admin");
let items = [], cats = {}, page = 1, delId = null, editing = false;
function load() {
  $.when(getData("categories"), getData("inventory")).done((c, i) => {
    cats = c[0] || {}; items = Object.entries(i[0] || {}).map(([id, v]) => ({ id, ...v }));
    const opts = Object.entries(cats).map(([k, v]) => `<option value="${k}">${$("<i>").text(v.name).html()}</option>`).join("");
    $("#pcat").html('<option value="">Category</option>' + opts); $("#fc").html('<option value="">All categories</option>' + opts);
    $("#clist").text(Object.values(cats).map(c => c.name).join(", ") || "No categories yet"); draw();
  }).fail(x => toast(errMsg(x), true));
}
function draw() {
  const q = $("#sq").val().toLowerCase(), fc = $("#fc").val(), size = +$("#ps").val();
  const list = items.filter(p => (!fc || p.cat_id === fc) && (!q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)));
  const rows = slice(list, page, size).map(p => `<tr><td>${p.id}</td><td>${$("<i>").text(p.title).html()}</td><td>${(cats[p.cat_id] || {}).name || "-"}</td><td>${p.qty}</td><td>${rs(p.price)}</td>
  <td class="${p.qty > 0 ? "ok" : "bad"}">${p.qty > 0 ? "In Stock" : "Out of Stock"}</td><td>${p.active ? "Yes" : "No"}</td>
  <td class="row"><button data-a="e" data-id="${p.id}">Edit</button><button data-a="t" data-id="${p.id}">${p.active ? "Deactivate" : "Activate"}</button><button class="dan" data-a="d" data-id="${p.id}">Delete</button></td></tr>`).join("");
  $("#tb").html(rows || '<tr><td colspan="8" class="empty">No products found</td></tr>'); pager("#pg", list.length, page, size, n => { page = n; draw(); });
}
$("#sq,#fc,#ps").on("input change", () => { page = 1; draw(); });
$("#cadd").on("click", () => { const n = $("#cname").val().trim(); if (!n) return toast("Enter a name", true);
  postData("categories", { name: n, active: true }).done(() => { $("#cname").val(""); load(); }).fail(x => toast(errMsg(x), true)); });
function clear() { $("#pf")[0].reset(); $("#pid").prop("readonly", false); editing = false; $("#ft").text("Add Product"); $("#perr").text(""); }
$("#pcancel").on("click", clear);
$("#pf").on("submit", function (e) {
  e.preventDefault(); const id = $("#pid").val().trim(), qty = Number($("#pqty").val()), price = Number($("#pprice").val());
  let m = ""; if (!/^[A-Za-z0-9_-]+$/.test(id)) m = "Product ID: letters, digits, - or _ only.";
  else if (!editing && items.some(p => p.id === id)) m = "Product ID already exists.";
  else if (!$("#pcat").val()) m = "Select a category."; else if (!$("#ptitle").val().trim()) m = "Title required.";
  else if (!Number.isInteger(qty) || qty < 0) m = "Quantity must be a whole number ≥ 0."; else if (!(price > 0)) m = "Price must be greater than 0.";
  $("#perr").text(m); if (m) return;
  const old = items.find(p => p.id === id), now = new Date().toISOString();
  const obj = { cat_id: $("#pcat").val(), title: $("#ptitle").val().trim(), des: $("#pdes").val().trim(), qty, price, img: $("#pimg").val().trim(),
    active: old ? old.active : true, createdDate: old ? old.createdDate : now, updatedDate: now };
  putData("inventory/" + id, obj).done(() => { toast("Saved"); clear(); load(); }).fail(x => toast(errMsg(x), true));
});
$("#tb").on("click", "button", function () {
  const id = $(this).data("id"), p = items.find(x => x.id === id), a = $(this).data("a");
  if (a === "e") { editing = true; $("#ft").text("Edit Product"); $("#pid").val(id).prop("readonly", true); $("#pcat").val(p.cat_id); $("#ptitle").val(p.title);
    $("#pdes").val(p.des); $("#pqty").val(p.qty); $("#pprice").val(p.price); $("#pimg").val(p.img); scrollTo(0, 0); }
  if (a === "t") patchData("inventory/" + id, { active: !p.active, updatedDate: new Date().toISOString() }).done(load);
  if (a === "d") { delId = id; $("#dlg")[0].showModal(); }
});
$("#no").on("click", () => $("#dlg")[0].close());
$("#yes").on("click", () => { deleteData("inventory/" + delId).done(() => { $("#dlg")[0].close(); toast("Deleted"); load(); }); });
load();
// One click: writes sample categories + products straight into Firestore (no manual console work)
$("#seed").on("click", () => {
  const c = { c1: "Mobiles", c2: "Laptops", c3: "Accessories" }, now = new Date().toISOString();
  const p = [["P101","c1","Smartphone X","6GB/128GB",25,14999],["P102","c1","Smartphone Lite","4GB/64GB",120,8999],["P201","c2","Laptop Pro 15","i5/16GB/512GB",8,55999],["P301","c3","Wireless Earbuds","BT 5.3",200,1999],["P302","c3","Power Bank 10000mAh","Fast charge",0,1299]];
  $.when(...Object.entries(c).map(([k, n]) => putData("categories/" + k, { name: n, active: true })),
    ...p.map(([id, cat, t, d, q, pr]) => putData("inventory/" + id, { cat_id: cat, title: t, des: d, qty: q, price: pr, img: "", active: true, createdDate: now, updatedDate: now })))
    .done(() => { toast("Sample data loaded"); load(); }).fail(x => toast(errMsg(x), true));
});
