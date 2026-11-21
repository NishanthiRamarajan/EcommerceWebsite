/* bill.js - builds and prints customer invoices and browser-local receipts. */
const Bill = {
  number: function (orderId) {
    const d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "BILL-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + String(orderId).slice(-6).toUpperCase();
  },
  invoiceNumber: function (order) {
    const number = order.invoiceNumber || order.billNumber || Bill.number(order.orderId);
    return String(number).replace(/^DEMO-/i, "LOCAL-");
  },
  paymentLabel: function (order) {
    const method = String(order.paymentMethod || "").toLowerCase();
    if (method === "cod" || order.paymentType === "cash") return "Cash on Delivery";
    if (method === "card_demo" || order.paymentType === "card") return "Card (simulated)";
    if (method === "credit" || order.paymentType === "credit") return order.demoOnly ? "Store credit (simulated)" : "Store credit";
    return "Not recorded";
  },
  paymentStatusLabel: function (order) {
    const status = String(order.paymentStatus || "").toLowerCase();
    const labels = {
      pending: order.demoOnly ? "Pending (cash due on delivery)" : "Awaiting collection",
      outstanding: "Outstanding (local credit; not collected)",
      paid: "Marked paid (simulated)",
      "on-credit": "Store credit selected (not charged)",
      "refund-required": "Refund required",
      refunded: "Refunded",
      reversed: "Reversed (credit)",
      cancelled: "Cancelled"
    };
    return labels[status] || "Not recorded";
  },
  html: function (order, customer) {
    order = order || {};
    customer = customer || {};
    const isDemo = order.demoOnly === true;
    const rows = Utils.list(order.items).map(function (item) {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = Number(item.subtotal);
      return "<tr><td>" + Utils.esc(item.productName || item.title || "Product") + "<br><small>" + Utils.esc(item.productId || "") +
        "</small></td><td class='num'>" + quantity + "</td><td class='num'>" + Utils.money(unitPrice) + "</td><td class='num'>" +
        Utils.money(Number.isFinite(lineTotal) ? lineTotal : quantity * unitPrice) + "</td></tr>";
    }).join("");
    const address = order.shippingAddress || {};
    const orderDate = order.orderDate || order.date;
    const invoiceNumber = Bill.invoiceNumber(order);
    const orderStatus = order.orderStatus || order.status || "Not recorded";
    const totalQuantity = Number.isSafeInteger(order.totalQuantity)
      ? order.totalQuantity
      : Utils.list(order.items).reduce(function (sum, item) { return sum + (Number(item.quantity) || 0); }, 0);
    const email = customer.email || order.customerEmail || "";
    const mobile = customer.mobile || order.customerMobile || "";
    const delivery = address.address ? '<div class="bill-cust"><strong>Deliver to</strong><br>' + Utils.esc(address.name || order.customerName) + "<br>" +
      Utils.esc(address.address) + "<br>" + Utils.esc(address.city || "") + " " + Utils.esc(address.postalCode || "") + "<br>" + Utils.esc(address.mobile || mobile) + "</div>" : "";
    const localLabel = isDemo ? '<p class="hint"><strong>BROWSER-LOCAL INVOICE – NOT A TAX INVOICE</strong></p>' : "";

    return '<div class="bill">' + localLabel + '<div class="bill-head"><div><h2>Online Shopping</h2><p class="muted">' +
      (isDemo ? "Browser-local order invoice" : "Order receipt") + '</p></div><div class="bill-meta"><strong>Invoice ' + Utils.esc(invoiceNumber) +
      "</strong><br>Order " + Utils.esc(order.orderId) + "<br>" + Utils.dateTime(orderDate) + "</div></div>" +
      '<div class="bill-cust"><strong>Billed to</strong><br>' + Utils.esc(order.customerName || customer.name || "") +
      (email ? "<br>" + Utils.esc(email) : "") + (mobile ? "<br>" + Utils.esc(mobile) : "") + "</div>" +
      delivery +
      '<table class="data"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Line total</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<div class="bill-total"><div>Total quantity: ' + totalQuantity + "</div><div>Subtotal: " + Utils.money(order.subtotal || order.totalAmount) +
      "</div><div>Payment method: " + Utils.esc(Bill.paymentLabel(order)) + "</div><div>Payment status: " + Utils.esc(Bill.paymentStatusLabel(order)) +
      "</div><div>Order status: " + Utils.esc(orderStatus) + "</div><div class='grand'>Final amount " + Utils.money(order.totalAmount) + "</div></div></div>";
  },
  print: function (order, customer) {
    $("#printArea").remove();
    $('<div id="printArea"></div>').html(Bill.html(order, customer)).appendTo("body");
    window.print();
  }
};
