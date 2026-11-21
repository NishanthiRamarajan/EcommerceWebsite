/* customer/orders.js - customer-scoped local order history and invoice view. */
$(function () {
  if (!$("#ordersPage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  const session = Session.get();
  let all = [], current = null;

  function statusOf(order) {
    return String(order.orderStatus || order.status || "").toLowerCase();
  }

  function orderDate(order) {
    return order.orderDate || order.date;
  }

  function itemSummary(order) {
    return Utils.list(order.items).map(function (item) {
      return Utils.esc(item.productName || item.title || "Product") + " × " + (Number(item.quantity) || 0);
    }).join(", ");
  }

  const pg = new Paginator({
    container: "#pager",
    perPage: Prefs.get("pp", 10),
    onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#rows").html(items.map(function (order) {
        const id = Utils.esc(order.orderId);
        return "<tr><td>" + id + "</td><td>" + Utils.date(orderDate(order)) + "</td><td>" + itemSummary(order) +
          '</td><td>' + Utils.esc(Bill.paymentLabel(order)) + "<br><small class=\"muted\">" + Utils.esc(Bill.paymentStatusLabel(order)) +
          '</small></td><td class="num">' + Utils.money(order.totalAmount) + "</td><td>" + Utils.statusBadge(statusOf(order)) +
          '</td><td class="acts"><button class="btn btn-sm" data-view="' + id + '">View invoice</button> <button class="btn btn-sm btn-ghost" data-print="' + id + '">Print</button></td></tr>';
      }).join(""));
    }
  });

  function find(id) {
    return all.filter(function (order) { return order.orderId === id; })[0];
  }

  function apply() {
    const status = $("#fStatus").val();
    const list = all.filter(function (order) { return !status || statusOf(order) === status; });
    $("#empty").toggleClass("hidden", !!all.length);
    $("#tableBox").toggleClass("hidden", !all.length);
    pg.setItems(list);
  }

  $("#rows").on("click", "[data-view]", function () {
    current = find($(this).attr("data-view"));
    if (!current) return;
    $("#billBox").html(Bill.html(current));
    Utils.openModal("orderModal");
  });
  $("#rows").on("click", "[data-print]", function () {
    const order = find($(this).attr("data-print"));
    if (order) Bill.print(order);
  });
  $("#printCurrent").on("click", function () { if (current) Bill.print(current); });
  $("#fStatus").on("change", apply);

  try {
    all = DemoStore.getOrdersForCustomer(session.uid).sort(function (a, b) {
      return orderDate(b) - orderDate(a);
    });
    apply();
  } catch (error) {
    Utils.toast(error.message, "error");
  }
});
