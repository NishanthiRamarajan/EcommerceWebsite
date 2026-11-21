guard("customer");
const KEY = "cart_" + S().uid; // per-customer cart in localStorage (survives refresh/close/logout)
const getCart = () => JSON.parse(localStorage.getItem(KEY) || "{}"), setCart = c => localStorage.setItem(KEY, JSON.stringify(c));
let items = {}, cats = {}, page = 1; const size = 8;
const esc = t => $("<i>").text(t).html();
function load() {
  $.when(getData("categories"), getData("inventory")).done((c, i) => {
    cats = c[0] || {}; items = i[0] || {};
    $("#fc").html('<option value="">All categories</option>' + Object.entries(cats).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("")); draw(); drawCart();
  }).fail(x => toast(errMsg(x), true));
}
const avail = id => (items[id] && items[id].active) ? items[id].qty : 0;
function draw() {
  const q = $("#sq").val().toLowerCase(), fc = $("#fc").val();
  const list = Object.entries(items).filter(([id, p]) => p.active && (!fc || p.cat_id === fc) && (!q || p.title.toLowerCase().includes(q)));
  $("#gr").html(slice(list, page, size).map(([id, p]) => `<div class="card prod">${p.img ? `<img src="${esc(p.img)}" alt="">` : ""}<h4>${esc(p.title)}</h4><div>${rs(p.price)}</div>
   <div class="${p.qty > 0 ? "ok" : "bad"}">${p.qty > 0 ? "In Stock" : "Out of Stock"}</div><button class="pri" data-id="${id}" ${p.qty > 0 ? "" : "disabled"}>Add to Cart</button></div>`).join("") || '<div class="empty">No products found</div>');
  pager("#pg", list.length, page, size, n => { page = n; draw(); });
}
$("#sq,#fc").on("input change", () => { page = 1; draw(); });
$("#gr").on("click", "button", function () {
  const id = $(this).data("id"), c = getCart(), cur = c[id] || 0;
  if (cur + 1 > avail(id)) return toast("Only " + avail(id) + " in stock", true);
  c[id] = cur + 1; setCart(c); drawCart(); toast("Added to cart");
});
function drawCart() {
  const c = getCart(); let total = 0, warn = "";
  Object.keys(c).forEach(id => { const a = avail(id);
    if (a === 0) { warn += (items[id] ? items[id].title : id) + " is unavailable. "; } else if (c[id] > a) { c[id] = a; warn += items[id].title + " adjusted to stock (" + a + "). "; } });
  setCart(c);
  $("#ct").html(Object.keys(c).map(id => { const p = items[id], a = avail(id), sub = p ? p.price * c[id] : 0; if (a) total += sub;
    return `<tr><td>${p ? esc(p.title) : id}</td><td>${p ? rs(p.price) : "-"}</td><td><button data-m="-1" data-id="${id}">−</button> <input type="number" min="1" max="${a}" value="${c[id]}" data-id="${id}" style="width:60px"> <button data-m="1" data-id="${id}">+</button></td>
     <td>${rs(sub)}</td><td><button class="dan" data-m="x" data-id="${id}">Remove</button></td></tr>`; }).join("") || '<tr><td colspan="5" class="empty">Your cart is empty</td></tr>');
  $("#gt").text(rs(total)); $("#cw").text(warn); $("#cc").text(Object.values(c).reduce((s, n) => s + n, 0));
}
function setQty(id, n) { const c = getCart(), a = avail(id); n = Math.floor(Number(n)) || 1;
  if (n < 1) n = 1; if (n > a) { n = a; toast("Only " + a + " in stock", true); } c[id] = n; setCart(c); drawCart(); }
$("#ct").on("click", "button", function () { const id = $(this).data("id"), m = $(this).data("m"), c = getCart();
  if (m === "x") { delete c[id]; setCart(c); drawCart(); } else setQty(id, (c[id] || 1) + Number(m)); });
$("#ct").on("change", "input", function () { setQty($(this).data("id"), $(this).val()); });
load();
