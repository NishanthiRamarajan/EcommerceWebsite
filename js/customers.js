guard("admin");
let list = [], page = 1; const size = 5, esc = t => $("<i>").text(t).html();
function load() { getData("customers").done(d => { list = Object.entries(d).map(([id, v]) => ({ id, ...v })); draw(); }).fail(x => toast(errMsg(x), true)); }
function draw() {
  const q = $("#sq").val().toLowerCase(), f = list.filter(c => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  $("#tb").html(slice(f, page, size).map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.mobile)}</td>
   <td><input type="number" min="0" value="${c.creditLimit}" id="cl_${c.id}" style="width:90px"></td><td>${rs(c.creditUsed)}</td><td>${rs(c.creditLimit - c.creditUsed)}</td>
   <td class="${c.active ? "ok" : "bad"}">${c.active ? "Active" : "Inactive"}</td><td class="row"><button class="pri" data-a="s" data-id="${c.id}">Save limit</button>
   <button data-a="t" data-id="${c.id}">${c.active ? "Deactivate" : "Activate"}</button></td></tr>`).join("") || '<tr><td colspan="8" class="empty">No customers yet</td></tr>');
  pager("#pg", f.length, page, size, n => { page = n; draw(); });
}
$("#sq").on("input", () => { page = 1; draw(); });
$("#tb").on("click", "button", function () {
  const id = $(this).data("id"), c = list.find(x => x.id === id);
  if ($(this).data("a") === "t") return patchData("customers/" + id, { active: !c.active }).done(load).fail(x => toast(errMsg(x), true));
  const v = Number($("#cl_" + id).val());
  if (!Number.isFinite(v) || v < 0) return toast("Credit limit cannot be negative", true);
  if (v < c.creditUsed) return toast("Limit cannot be below credit already used (" + rs(c.creditUsed) + ")", true);
  patchData("customers/" + id, { creditLimit: v }).done(() => { toast("Credit limit updated"); load(); }).fail(x => toast(errMsg(x), true));
});
load();
