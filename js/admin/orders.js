/* admin/orders.js - browser-local orders, invoice view, and status changes. */
$(function () {
  if (!$("#ordRows").length || !Session.isAdmin()) return;
  let orders = [], current = null, requestedOrderHandled = false;
  const pg = new Paginator({
    container: "#pager",
    perPage: Prefs.get("pp", 10),
    onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#ordRows").html(items.length ? items.map(function (order) {
        const id = Utils.esc(order.orderId);
        const allowedNext = APP.NEXT[order.status] || [];
        return "<tr><td>" + id + "<br><small class='muted'>" + Utils.esc(Bill.invoiceNumber(order)) +
          "</small></td><td>" + Utils.dateTime(order.orderDate || order.date) + "</td><td>" + Utils.esc(order.customerName) +
          "<br><small class='muted'>" + Utils.esc(order.customerEmail) + "</small></td><td>" + Utils.esc(Bill.paymentLabel(order)) +
          '</td><td>' + Utils.esc(Bill.paymentStatusLabel(order)) + '</td><td class="num">' + Utils.money(order.totalAmount) +
          "</td><td>" + Utils.statusBadge(String(order.orderStatus || order.status || "").toLowerCase()) +
          '</td><td class="acts"><button class="btn btn-sm btn-ghost" data-act="view" data-id="' + id + '">View invoice</button>' +
          (allowedNext.length ? '<button class="btn btn-sm" data-act="status" data-id="' + id + '">Update status</button>' : "") +
          "</td></tr>";
      }).join("") : '<tr><td colspan="8" class="muted">No browser-local orders found.</td></tr>');
    }
  });

  function find(id) {
    return orders.filter(function (order) { return order.orderId === id; })[0];
  }

  function filter() {
    const status = $("#fStatus").val();
    const query = $.trim($("#fQ").val()).toLowerCase();
    const method = $("#fPayment").val();
    const from = Utils.dayStart($("#dFrom").val());
    const to = Utils.dayEnd($("#dTo").val());
    pg.setItems(orders.filter(function (order) {
      const date = order.orderDate || order.date;
      const terms = [order.orderId, order.invoiceNumber, order.billNumber, order.customerName, order.customerEmail].join(" ").toLowerCase();
      return (!status || order.status === status) &&
        (!method || String(order.paymentMethod || "").toLowerCase() === method) &&
        date >= from && date <= to && (!query || terms.indexOf(query) > -1);
    }));
  }

  function load() {
    try {
      orders = DemoStore.getOrders().slice().sort(function (a, b) {
        return (b.orderDate || b.date) - (a.orderDate || a.date);
      });
      filter();
      if (!requestedOrderHandled) {
        requestedOrderHandled = true;
        const orderId = Utils.param("orderId");
        if (orderId) {
          current = find(orderId);
          if (current) {
            $("#billBox").html(Bill.html(current));
            Utils.openModal("orderModal");
          } else {
            Utils.toast("That browser-local order was not found on this device.", "error");
          }
        }
      }
    } catch (error) {
      Utils.toast(error.message, "error");
    }
  }

  $("#fStatus, #fPayment, #dFrom, #dTo").on("change", filter);
  $("#fQ").on("input", Utils.debounce(filter, 250));

  $("#ordRows").on("click", "[data-act]", function () {
    current = find($(this).attr("data-id"));
    if (!current) return;
    if ($(this).attr("data-act") === "view") {
      $("#billBox").html(Bill.html(current));
      Utils.openModal("orderModal");
      return;
    }

    const allowed = APP.NEXT[current.status] || [];
    $("#stInfo").text("Browser-local order " + current.orderId + " is " + (current.orderStatus || current.status) + ".");
    $("#stSel").html(allowed.map(function (status) {
      return '<option value="' + Utils.esc(status) + '">' + Utils.esc(status.charAt(0).toUpperCase() + status.slice(1)) + "</option>";
    }).join(""));
    Utils.openModal("statusModal");
  });

  $("#printCurrent").on("click", function () { if (current) Bill.print(current); });
  $("#stForm").on("submit", function (event) {
    event.preventDefault();
    if (!current) return;
    const next = $("#stSel").val();
    if ((APP.NEXT[current.status] || []).indexOf(next) < 0) {
      Utils.toast("That order status change is not allowed.", "error");
      return;
    }
    if (next === "cancelled") {
      Utils.confirm("Cancel this browser-local order? Its browser-local stock and simulated credit usage will be restored once.").then(function (confirmed) {
        if (confirmed) updateStatus(next);
      });
      return;
    }
    updateStatus(next);
  });

  function updateStatus(next) {
    try {
      DemoStore.updateOrderStatus(current.orderId, next);
      Utils.closeModal("statusModal");
      Utils.toast("Order is now " + next + ".", "success");
      load();
    } catch (error) {
      Utils.toast(error.message, "error");
    }
  }

  load();
});
