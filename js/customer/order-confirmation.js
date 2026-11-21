/* order-confirmation.js - displays only the signed-in customer's browser-local invoice. */
$(function () {
  if (!$("#confirmationPage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  if (Session.isAdmin()) {
    $("#confirmationMessage").html('<div class="message error">Admin accounts cannot view customer order confirmations.</div>');
    return;
  }

  const session = Session.get();
  const orderId = Utils.param("orderId");
  if (!orderId) {
    $("#confirmationMessage").html('<div class="message error">No browser-local order was selected. Open My Orders to view your invoices.</div>');
    return;
  }

  let order;
  try {
    order = DemoStore.getOrders().filter(function (item) {
      return item.orderId === orderId && item.customerId === session.uid;
    })[0];
  } catch (error) {
    $("#confirmationMessage").html('<div class="message error">' + Utils.esc(error.message) + "</div>");
    return;
  }
  if (!order) {
    $("#confirmationMessage").html('<div class="message error">This browser-local order is not available for the signed-in customer in this browser.</div>');
    return;
  }

  const customer = { name: order.customerName, email: order.customerEmail || session.email };
  $("#confirmationMessage").html('<div class="message success">Order placed successfully! Your invoice is ready. Order ID: ' +
    Utils.esc(order.orderId) + ".</div>" +
    (Utils.param("cartClear") === "failed"
      ? '<div class="message info">The order was saved, but this browser could not clear the cart. Remove those items before starting another checkout.</div>'
      : '<p class="hint">BROWSER-LOCAL: This order and invoice are stored only in this browser. No real payment was collected.</p>'));
  $("#invoice").html(Bill.html(order, customer)).removeClass("hidden");
  $("#confirmationActions").removeClass("hidden");
  $("#printInvoice").on("click", function () { Bill.print(order, customer); });
});
