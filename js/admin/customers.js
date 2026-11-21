/* admin/customers.js - manage Firestore customer profiles and credit records. */
$(function () {
  if (!$("#custRows").length || !Session.isAdmin()) return;
  let all = [], cur = null;
  const pg = new Paginator({ container: "#pager", perPage: Prefs.get("pp", 10), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#custRows").html(items.length ? items.map(function (c) {
        const id = Utils.esc(c.id);
        return "<tr><td>" + Utils.esc(c.name) + "<br><small class='muted'>" + id + "</small></td><td>" + Utils.esc(c.email) + "</td><td>" + Utils.esc(c.mobile) + '</td><td class="num">' + Utils.money(c.creditLimit) + '</td><td class="num">' + Utils.money(c.creditUsed) + '</td><td class="num">' + Utils.money(c.creditLimit - c.creditUsed) +
          "</td><td>" + (c.active ? '<span class="badge st-delivered">Active</span>' : '<span class="badge st-cancelled">Inactive</span>') + '</td><td class="acts"><button class="btn btn-sm btn-ghost" data-act="view" data-id="' + id + '">View</button><button class="btn btn-sm" data-act="limit" data-id="' + id + '">Firestore credit limit</button>' +
          '<button class="btn btn-sm btn-ghost" data-act="pay" data-id="' + id + '">Record Firestore payment</button><button class="btn btn-sm btn-ghost" data-act="toggle" data-id="' + id + '">' + (c.active ? "Deactivate" : "Activate") + "</button></td></tr>";
      }).join("") : '<tr><td colspan="8" class="muted">No customers found.</td></tr>');
    } });
  function find(id) { return all.filter(function (c) { return c.id === id; })[0]; }
  function filter() {
    const q = $.trim($("#fQ").val()).toLowerCase();
    pg.setItems(all.filter(function (c) { return !q || [c.name, c.email, c.mobile, c.id].join(" ").toLowerCase().indexOf(q) > -1; }));
  }
  function load(keep) { DB.get("customers").done(function (o) { all = Utils.list(o).sort(function (a, b) { return a.name.localeCompare(b.name); }); if (keep) pg.setItems(all, true); else filter(); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); }); }
  $("#fQ").on("input", Utils.debounce(filter, 250));
  const err = function (x) { Utils.toast(AuthAPI.friendlyError(x), "error"); };

  $("#custRows").on("click", "[data-act]", function () {
    cur = find($(this).attr("data-id")); const act = $(this).attr("data-act");
    if (act === "view") {
      $("#viewBody").html('<dl class="kv"><dt>Customer ID</dt><dd>' + Utils.esc(cur.id) + "</dd><dt>Name</dt><dd>" + Utils.esc(cur.name) + "</dd><dt>Email</dt><dd>" + Utils.esc(cur.email) + "</dd><dt>Mobile</dt><dd>" + Utils.esc(cur.mobile) + "</dd><dt>Firestore credit limit</dt><dd>" + Utils.money(cur.creditLimit) +
        "</dd><dt>Firestore credit used</dt><dd>" + Utils.money(cur.creditUsed) + "</dd><dt>Firestore available</dt><dd>" + Utils.money(cur.creditLimit - cur.creditUsed) + "</dd><dt>Status</dt><dd>" + (cur.active ? "Active" : "Inactive") + "</dd><dt>Joined</dt><dd>" + Utils.dateTime(cur.createdAt) + "</dd></dl>");
      Utils.openModal("viewModal");
    }
    if (act === "limit") { $("#limName").text(cur.name + " (Firestore credit used " + Utils.money(cur.creditUsed) + ")"); $("#limVal").val(cur.creditLimit); Utils.showFieldErrors({}, "#limForm"); Utils.openModal("limModal"); }
    if (act === "pay") { $("#payName").text(cur.name + " has Firestore credit used of " + Utils.money(cur.creditUsed)); $("#payVal").val(""); Utils.showFieldErrors({}, "#payForm"); Utils.openModal("payModal"); }
    if (act === "toggle") DB.patch("customers/" + cur.id, { active: !cur.active }).done(function () { Utils.toast(cur.active ? "Customer deactivated" : "Customer activated", "success"); load(true); }).fail(err);
  });
  $("#limForm").on("submit", function (e) {
    e.preventDefault(); const v = $.trim($("#limVal").val()), m = Validate.creditLimit(v, cur.creditUsed);
    Utils.showFieldErrors(m ? { limVal: m } : {}, "#limForm"); if (m) return;
    DB.patch("customers/" + cur.id, { creditLimit: parseInt(v, 10) }).done(function () { Utils.closeModal("limModal"); Utils.toast("Firestore credit limit updated.", "success"); load(true); }).fail(err);
  });
  $("#payForm").on("submit", function (e) {
    e.preventDefault(); const v = $.trim($("#payVal").val()); let m = "";
    if (!Validate.wholeNumber(v) || parseInt(v, 10) < 1) m = "Enter a whole amount of at least 1."; else if (parseInt(v, 10) > cur.creditUsed) m = "Amount is more than the credit used (" + Utils.money(cur.creditUsed) + ").";
    Utils.showFieldErrors(m ? { payVal: m } : {}, "#payForm"); if (m) return;
    DemoCheckout.recordCreditPayment(cur.id, parseInt(v, 10)).done(function () {
      Utils.closeModal("payModal");
      Utils.toast("Firestore repayment recorded. Firestore credit used reduced.", "success");
      load(true);
    }).fail(function (error) {
      Utils.toast("Firestore repayment failed: " + AuthAPI.friendlyError(error) + " Browser-local checkout credit was not changed.", "error");
    });
  });
  load();
});
