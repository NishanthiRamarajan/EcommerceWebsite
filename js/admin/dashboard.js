/* dashboard.js - summary cards + latest orders. Sales exclude cancelled orders. */
$(function () {
  if (!$("#stats").length || !Session.isAdmin()) return;
  const $messagePanel = $('<section class="panel"><h2>Admin messages</h2><div id="adminMessages"><div class="loading">Loading...</div></div></section>');
  $messagePanel.insertAfter("#stats");
  $("#recent").closest(".table-wrap").prev("h2").text("Latest Firestore orders");
  $('<section class="panel"><h2>Browser-local orders</h2><p class="hint">These figures use this browser\'s local data and are separate from Firestore records.</p>' +
    '<div id="demoStats" class="stat-grid"></div><h3>Latest browser-local orders</h3><div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Payment</th><th class="num">Total</th><th>Status</th></tr></thead><tbody id="demoRecent"></tbody></table></div></section>').insertAfter($messagePanel);
  let messageQuery = "", messageStatus = "all", firestoreMessages = [], firestoreMessageError = null;
  function filterMessages(rows) {
    const query = messageQuery.toLowerCase();
    return rows.filter(function (item) {
      const readState = item.read ? "read" : "unread";
      const text = [item.message, item.orderId, item.customerName, item.customerEmail].join(" ").toLowerCase();
      return (messageStatus === "all" || messageStatus === readState) && (!query || text.indexOf(query) > -1);
    }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  }

  function messageTable(rows, source) {
    if (!rows.length) return '<p class="muted">No matching messages.</p>';
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Message</th><th>Date</th><th>Status</th><th>Related order</th><th>Actions</th></tr></thead><tbody>' +
      rows.map(function (item) {
        const label = source === "local" ? '<span class="badge st-confirmed">LOCAL</span> ' : "";
        const message = String(item.message || "").replace(/\bdemo\b/gi, "browser-local");
        const orderLink = source === "local" && item.orderId
          ? '<a class="btn btn-sm btn-ghost" href="orders.html?orderId=' + encodeURIComponent(item.orderId) + '">View order</a>'
          : '<span class="muted">-</span>';
        const readLabel = item.read ? "Mark unread" : "Mark read";
        const readAction = item.read ? "unread" : "read";
        return "<tr><td>" + label + Utils.esc(message) + "</td><td>" + Utils.dateTime(item.createdAt) + "</td><td>" +
          (item.read ? "Read" : '<span class="badge st-pending">Unread</span>') + "</td><td>" + orderLink + "</td><td>" +
          (item.id ? '<button class="btn btn-sm btn-ghost" data-message-action="' + readAction + '" data-source="' + source + '" data-id="' + Utils.esc(item.id) + '">' + readLabel + "</button> " +
            '<button class="btn btn-sm btn-danger" data-message-action="delete" data-source="' + source + '" data-id="' + Utils.esc(item.id) + '">Delete</button>' : '<span class="muted">Unavailable</span>') +
          "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function renderMessages() {
    let localMessages = [], localError = null;
    try {
      localMessages = DemoStore.getNotifications();
    } catch (error) {
      localError = error;
    }
    const localUnread = localMessages.filter(function (item) { return !item.read; }).length;
    const firestoreUnread = firestoreMessages.filter(function (item) { return !item.read; }).length;
    const localHtml = localError
      ? '<div class="message error">Browser-local messages could not be loaded: ' + Utils.esc(localError.message) + "</div>"
      : messageTable(filterMessages(localMessages), "local");
    const firestoreHtml = firestoreMessageError
      ? '<div class="message error">Firestore messages could not be loaded: ' + Utils.esc(AuthAPI.friendlyError(firestoreMessageError)) +
        " Browser-local messages are shown separately.</div>"
      : messageTable(filterMessages(firestoreMessages), "firestore");
    if (!$("#messageSearch").length) {
      $("#adminMessages").html(
        '<div class="toolbar"><div class="grow"><label for="messageSearch">Search messages</label><input id="messageSearch" type="search" placeholder="Message, order or customer"></div>' +
        '<div><label for="messageStatus">Read status</label><select id="messageStatus"><option value="all">All messages</option><option value="unread">Unread</option><option value="read">Read</option></select></div></div>' +
        '<section><h3>Browser-local messages (<span id="localUnreadCount"></span>)</h3>' +
        '<button class="btn btn-sm btn-ghost" id="markAllLocal" data-message-action="mark-all" data-source="local">Mark all browser-local messages as read</button><div id="localMessageList"></div></section>' +
        '<section><h3>Firestore messages (<span id="firestoreUnreadCount"></span>)</h3>' +
        '<button class="btn btn-sm btn-ghost" id="markAllFirestore" data-message-action="mark-all" data-source="firestore">Mark all Firestore messages as read</button><div id="firestoreMessageList"></div></section>');
      $("#messageSearch").val(messageQuery);
      $("#messageStatus").val(messageStatus);
    }
    $("#localUnreadCount").text(localUnread + " unread");
    $("#firestoreUnreadCount").text(firestoreUnread + " unread");
    $("#markAllLocal").prop("disabled", !localUnread);
    $("#markAllFirestore").prop("disabled", !!firestoreMessageError || !firestoreUnread);
    $("#markAllFirestore").toggleClass("hidden", !!firestoreMessageError);
    $("#localMessageList").html(localHtml);
    $("#firestoreMessageList").html(firestoreHtml);
  }

  function loadMessages() {
    try {
      firestoreMessages = [];
      firestoreMessageError = null;
      renderMessages();
      DB.get("adminNotifications").done(function (notifications) {
        firestoreMessages = Utils.list(notifications);
        renderMessages();
      }).fail(function (error) {
        firestoreMessageError = error;
        renderMessages();
      });
    } catch (error) {
      firestoreMessageError = error;
      renderMessages();
    }
  }

  $("#adminMessages").on("input", "#messageSearch", function () {
    messageQuery = $.trim($(this).val());
    renderMessages();
  }).on("change", "#messageStatus", function () {
    messageStatus = $(this).val() || "all";
    renderMessages();
  }).on("click", "[data-message-action]", function () {
    const action = $(this).attr("data-message-action");
    const source = $(this).attr("data-source");
    const id = $(this).attr("data-id");
    if (action === "mark-all" && source === "local") {
      try {
        const count = DemoStore.markAllNotificationsRead();
        Utils.toast(count + " browser-local messages marked as read.", "success");
        loadMessages();
      } catch (error) {
        Utils.toast(error.message, "error");
      }
      return;
    }
    if (source === "local") {
      try {
        if (action === "read") DemoStore.markNotificationRead(id);
        if (action === "unread") DemoStore.markNotificationUnread(id);
        if (action === "delete") {
          Utils.confirm("Delete this browser-local message? The related order will remain unchanged.").then(function (confirmed) {
            if (!confirmed) return;
            try {
              DemoStore.deleteNotification(id);
              loadMessages();
            } catch (error) {
              Utils.toast(error.message, "error");
            }
          });
          return;
        }
        loadMessages();
      } catch (error) {
        Utils.toast(error.message, "error");
      }
      return;
    }
    if (action === "mark-all" && source === "firestore") {
      const unread = firestoreMessages.filter(function (item) { return !item.read && item.id; });
      if (!unread.length) return;
      const chunkSize = 400;
      function markChunk(start, completed) {
        const batch = unread.slice(start, start + chunkSize), updates = {};
        batch.forEach(function (item) { updates["adminNotifications/" + item.id + "/read"] = true; });
        if (!batch.length) {
          Utils.toast(completed + " Firestore messages marked as read.", "success");
          loadMessages();
          return;
        }
        DB.multiUpdate(updates).done(function () {
          markChunk(start + batch.length, completed + batch.length);
        }).fail(function (error) {
          loadMessages();
          Utils.toast("Firestore mark-all stopped after " + completed + " messages: " + AuthAPI.friendlyError(error), "error");
        });
      }
      markChunk(0, 0);
      return;
    }
    if (action === "delete") {
      Utils.confirm("Delete this Firestore message? The related order and payment records will remain unchanged.").then(function (confirmed) {
        if (!confirmed) return;
        DB.remove("adminNotifications/" + id).done(loadMessages)
          .fail(function (error) { Utils.toast("Firestore message could not be deleted: " + AuthAPI.friendlyError(error), "error"); });
      });
      return;
    }
    DB.patch("adminNotifications/" + id, { read: action === "read" }).done(loadMessages)
      .fail(function (error) { Utils.toast("Firestore message could not be updated: " + AuthAPI.friendlyError(error), "error"); });
  });
  loadMessages();

  function showDemoSummary() {
    try {
      const orders = DemoStore.getOrders();
      const successful = orders.filter(function (order) { return order.status !== "cancelled"; });
      const cancelled = orders.filter(function (order) { return order.status === "cancelled"; });
      const total = function (list) { return list.reduce(function (sum, order) { return sum + order.totalAmount; }, 0); };
      const card = function (value, label, style) {
        return '<div class="stat ' + (style || "") + '"><div class="v">' + value + '</div><div class="l">' + label + "</div></div>";
      };
      $("#demoStats").html(card(orders.length, "Browser-local orders") + card(Utils.money(total(successful)), "Local order value (excluding cancelled)") +
        card(Utils.money(total(successful.filter(function (order) { return order.paymentMethod === "COD"; }))), "COD value") +
        card(Utils.money(total(successful.filter(function (order) {
          return order.paymentMethod === "CREDIT" && String(order.paymentStatus).toLowerCase() === "outstanding";
        }))), "Local credit outstanding") + card(cancelled.length, "Cancelled orders", "warn"));
      const recent = orders.slice().sort(function (a, b) { return (b.orderDate || b.date) - (a.orderDate || a.date); }).slice(0, 5);
      $("#demoRecent").html(recent.length ? recent.map(function (order) {
        return "<tr><td>" + Utils.esc(order.orderId) + "</td><td>" + Utils.esc(order.customerName) + "</td><td>" +
          Utils.date(order.orderDate || order.date) + "</td><td>" + Utils.esc(Bill.paymentLabel(order)) +
          '</td><td class="num">' + Utils.money(order.totalAmount) + "</td><td>" +
          Utils.statusBadge(String(order.orderStatus || order.status || "").toLowerCase()) + "</td></tr>";
      }).join("") : '<tr><td colspan="6" class="muted">No browser-local orders yet.</td></tr>');
    } catch (error) {
      $("#demoStats").html('<div class="message error">' + Utils.esc(error.message) + "</div>");
      $("#demoRecent").html('<tr><td colspan="6" class="muted">Browser-local orders could not be loaded.</td></tr>');
    }
  }
  showDemoSummary();

  $.when(DB.get("customers"), DB.get("inventory"), DB.get("categories"), DB.get("orders")).done(function (cu, inv, ca, od) {
    const customers = Utils.list(cu), products = Utils.list(inv), cats = Utils.list(ca), orders = Utils.flattenOrders(od);
    const sales = orders.filter(function (o) { return o.status !== "cancelled"; }).reduce(function (t, o) { return t + o.totalAmount; }, 0);
    const low = products.filter(function (p) { return p.quantity < APP.LOW_STOCK; }).length, out = products.filter(function (p) { return p.quantity === 0; }).length;
    const card = function (v, l, c) { return '<div class="stat ' + (c || "") + '"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; };
    $("#stats").html(card(customers.length, "Firestore customers") + card(products.length, "Firestore products") + card(cats.length, "Firestore categories") + card(orders.length, "Firestore orders") +
      card(Utils.money(sales), "Firestore order value (excluding cancelled)") + card(low, "Firestore low stock (below " + APP.LOW_STOCK + ")", "warn") + card(out, "Firestore out of stock", "bad"));
    const recent = orders.sort(function (a, b) { return b.date - a.date; }).slice(0, 5);
    $("#recent").html(recent.length ? recent.map(function (o) {
      return "<tr><td>" + Utils.esc(o.orderId) + "</td><td>" + Utils.esc(o.customerName) + "</td><td>" + Utils.date(o.date) + '</td><td class="num">' + Utils.money(o.totalAmount) + "</td><td>" + Utils.statusBadge(o.status) + "</td></tr>";
    }).join("") : '<tr><td colspan="5" class="muted">No orders yet.</td></tr>');
  }).fail(function (e) { $("#stats").html('<div class="message error">' + Utils.esc(AuthAPI.friendlyError(e)) + "</div>"); });
});
