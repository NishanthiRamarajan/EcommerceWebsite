/* reports.js - Customer, Inventory and Sales reports (the page decides which set via <body data-report="...">).
   Everything is plain JavaScript on arrays: filter(), map(), reduce(), sort(), slice().
   "Successful" orders = every order that is not cancelled. */
$(function () {
  const kind = $("body").data("report");
  if (!kind || !Session.isAdmin()) return;
  const sum = function (a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); };
  const group = function (a, kf) { const m = {}; a.forEach(function (x) { const k = kf(x); (m[k] = m[k] || []).push(x); }); return m; };
  const ok = function (d, r) { return d.orders.filter(function (o) { return o.status !== "cancelled" && o.date >= r.from && o.date <= r.to; }); };
  const rank = function (rows) { return rows.map(function (r, i) { return $.extend({ rank: i + 1 }, r); }); };
  const C = function (l, k, o) { return $.extend({ l: l, k: k }, o); };
  const money = function (v) { return Utils.money(v); };
  const yn = function (v) { return v ? "Active" : "Inactive"; };
  const catName = function (d, id) { return d.catMap[id] ? d.catMap[id].name : id; };

  const paymentLabel = function (method) {
    return { cash: "Cash on delivery", card: "Card (simulated)", credit: "Store credit", cod: "Cash on delivery", card_demo: "Card (simulated)", credit_repayment: "Credit repayment" }[method] || method || "Not recorded";
  };
  const paymentStatusLabel = function (status) {
    return { pending: "Awaiting collection", paid: "Marked paid (simulated)", "on-credit": "Store credit selected (not charged)", "refund-required": "Refund required", refunded: "Refunded", reversed: "Reversed (credit)", cancelled: "Cancelled" }[status] || status || "Not recorded";
  };
  const orderCols = [C("Order ID", "orderId"), C("Date", "date", { f: Utils.date }), C("Customer", "customerName"),
    C("Payment", "paymentType", { f: paymentLabel }), C("Payment status", "paymentStatus", { f: paymentStatusLabel }),
    C("Qty", "totalQuantity", { n: 1 }), C("Amount", "totalAmount", { n: 1, f: money }), C("Status", "status")];
  const ordersReport = function (d, r, pay) {
    const rows = ok(d, r).filter(function (o) { return !pay || o.paymentType === pay; }).sort(function (a, b) { return b.date - a.date; });
    return { cols: orderCols, rows: rows, summary: rows.length + " orders, total " + money(sum(rows, function (o) { return o.totalAmount; })) };
  };
  const perCustomer = function (d, r, pay) {
    const g = group(ok(d, r).filter(function (o) { return !pay || o.paymentType === pay; }), function (o) { return o.customerId; });
    const rows = Object.keys(g).map(function (id) { const c = d.cust[id]; return { name: c ? c.name : g[id][0].customerName, email: c ? c.email : "", orders: g[id].length, total: sum(g[id], function (o) { return o.totalAmount; }) }; })
      .sort(function (a, b) { return b.total - a.total; });
    return { rows: rows, cols: [C("Customer", "name"), C("Email", "email"), C("Orders", "orders", { n: 1 }), C("Total", "total", { n: 1, f: money })], summary: rows.length + " customers, total " + money(sum(rows, function (x) { return x.total; })) };
  };
  const items = function (d, r) {
    const out = []; ok(d, r).forEach(function (o) { Utils.list(o.items).forEach(function (i) { out.push({ catId: i.catId, pid: i.productId, name: i.productName, qty: i.quantity, amt: i.subtotal }); }); });
    return out;
  };
  const perProduct = function (d, r, asc) {
    const g = group(items(d, r), function (i) { return i.pid; });
    let rows = Object.keys(g).map(function (id) { return { pid: id, name: g[id][0].name, qty: sum(g[id], function (i) { return i.qty; }), amt: sum(g[id], function (i) { return i.amt; }) }; });
    rows.sort(function (a, b) { return asc ? a.qty - b.qty : b.qty - a.qty; }); rows = rank(rows.slice(0, 10));
    return { rows: rows, cols: [C("Rank", "rank"), C("Product ID", "pid"), C("Product", "name"), C("Units sold", "qty", { n: 1 }), C("Sales", "amt", { n: 1, f: money })], summary: "Showing " + rows.length + " products" };
  };
  const stockCols = function (d) { return [C("ID", "id"), C("Title", "title"), C("Category", "catId", { f: function (v) { return catName(d, v); } }), C("Quantity", "quantity", { n: 1 }), C("Price", "price", { n: 1, f: money }), C("Status", "active", { f: yn })]; };
  const stock = function (d, filterFn) {
    const rows = d.products.filter(filterFn).sort(function (a, b) { return a.id.localeCompare(b.id); });
    return { rows: rows, cols: stockCols(d), summary: rows.length + " products, " + sum(rows, function (p) { return p.quantity; }) + " units" };
  };

  const REPORTS = {
    customers: {
      all: { label: "All customers", dates: 1, run: function (d, r) {
        const rows = d.customers.filter(function (c) { return c.createdAt >= r.from && c.createdAt <= r.to; });
        return { rows: rows, summary: rows.length + " customers", cols: [C("Customer ID", "id"), C("Name", "name"), C("Email", "email"), C("Mobile", "mobile"), C("Credit limit", "creditLimit", { n: 1, f: money }), C("Credit used", "creditUsed", { n: 1, f: money }), C("Active", "active", { f: yn }), C("Joined", "createdAt", { f: Utils.date })] }; } },
      top10: { label: "Top 10 customers by purchase amount", dates: 1, run: function (d, r) {
        const x = perCustomer(d, r); x.rows = rank(x.rows.slice(0, 10)); x.cols.unshift(C("Rank", "rank")); x.summary = "Top " + x.rows.length + " customers"; return x; } },
      cash: { label: "Cash purchases (customer-wise)", dates: 1, run: function (d, r) { return perCustomer(d, r, "cash"); } },
      credit: { label: "Credit purchases (customer-wise)", dates: 1, run: function (d, r) { return perCustomer(d, r, "credit"); } }
    },
    inventory: {
      all: { label: "Current stock - all products", run: function (d) { return stock(d, function () { return true; }); } },
      category: { label: "Category-wise stock", run: function (d) {
        const g = group(d.products, function (p) { return p.catId; });
        const rows = Object.keys(g).map(function (id) { return { cat: catName(d, id), n: g[id].length, units: sum(g[id], function (p) { return p.quantity; }), value: sum(g[id], function (p) { return p.quantity * p.price; }) }; }).sort(function (a, b) { return a.cat.localeCompare(b.cat); });
        return { rows: rows, cols: [C("Category", "cat"), C("Products", "n", { n: 1 }), C("Units in stock", "units", { n: 1 }), C("Stock value", "value", { n: 1, f: money })], summary: sum(rows, function (x) { return x.units; }) + " units in " + rows.length + " categories" }; } },
      high: { label: "High stock (more than " + APP.HIGH_STOCK + ")", run: function (d) { return stock(d, function (p) { return p.quantity > APP.HIGH_STOCK; }); } },
      low: { label: "Low stock (fewer than " + APP.LOW_STOCK + ")", run: function (d) { return stock(d, function (p) { return p.quantity < APP.LOW_STOCK; }); } },
      out: { label: "Out of stock (quantity 0)", run: function (d) { return stock(d, function (p) { return p.quantity === 0; }); } }
    },
    sales: {
      all: { label: "All sales", dates: 1, run: function (d, r) { return ordersReport(d, r); } },
      category: { label: "Category-wise sales", dates: 1, run: function (d, r) {
        const g = group(items(d, r), function (i) { return i.catId; });
        const rows = Object.keys(g).map(function (id) { return { cat: catName(d, id), qty: sum(g[id], function (i) { return i.qty; }), amt: sum(g[id], function (i) { return i.amt; }) }; }).sort(function (a, b) { return b.amt - a.amt; });
        return { rows: rows, cols: [C("Category", "cat"), C("Units sold", "qty", { n: 1 }), C("Sales", "amt", { n: 1, f: money })], summary: "Total " + money(sum(rows, function (x) { return x.amt; })) }; } },
      cash: { label: "Cash-on-delivery orders", dates: 1, run: function (d, r) { return ordersReport(d, r, "cash"); } },
      card: { label: "Simulated card orders", dates: 1, run: function (d, r) { return ordersReport(d, r, "card"); } },
      credit: { label: "Store-credit orders", dates: 1, run: function (d, r) { return ordersReport(d, r, "credit"); } },
      payments: { label: "Payment transactions", dates: 1, run: function (d, r) {
        const rows = d.payments.filter(function (payment) { return payment.createdAt >= r.from && payment.createdAt <= r.to; })
          .sort(function (a, b) { return b.createdAt - a.createdAt; });
        const received = sum(rows.filter(function (payment) { return payment.status === "paid"; }), function (payment) { return payment.amount; });
        const cols = [C("Date", "createdAt", { f: Utils.dateTime }), C("Customer", "customerName"), C("Order ID", "orderId"),
          C("Kind", "kind", { f: function (v) { return v === "credit-repayment" ? "Credit repayment" : "Order payment"; } }),
          C("Method", "method", { f: paymentLabel }), C("Amount", "amount", { n: 1, f: money }),
          C("Status", "status", { f: paymentStatusLabel })];
        return { rows: rows, cols: cols, summary: rows.length + " transactions, " + money(received) + " marked paid" };
      } },
      top10: { label: "Top 10 selling products", dates: 1, run: function (d, r) { return perProduct(d, r, false); } },
      bottom10: { label: "Bottom 10 selling products (sold at least once)", dates: 1, run: function (d, r) { return perProduct(d, r, true); } }
    }
  }[kind];

  let cols = [], reportRows = [], filteredReportRows = [], currentReportKey = "", reportFilterField = "";
  const pg = new Paginator({ container: "#pager", perPage: Prefs.get("pp", 10), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      const head = "<tr>" + cols.map(function (c) { return "<th" + (c.n ? ' class="num"' : "") + ">" + Utils.esc(c.l) + "</th>"; }).join("") + "</tr>";
      const body = items.length ? items.map(function (row) {
        return "<tr>" + cols.map(function (c) { const raw = row[c.k], v = c.f ? c.f(raw) : raw; return "<td" + (c.n ? ' class="num"' : "") + ">" + Utils.esc(v) + "</td>"; }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="' + cols.length + '" class="muted">No data for this report.</td></tr>';
      $("#repTable").html("<thead>" + head + "</thead><tbody>" + body + "</tbody>");
    } });

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv(filename, headers, rows) {
    const csv = [headers].concat(rows).map(function (row) { return row.map(csvCell).join(","); }).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function configureReportFilter(rows) {
    const options = [{ value: "", label: "All" }];
    reportFilterField = "";
    if (kind === "customers" && currentReportKey === "all") {
      reportFilterField = "active";
      options.push({ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" });
    } else if (kind === "inventory") {
      reportFilterField = "category";
      const categories = {};
      rows.forEach(function (row) {
        const value = row.catId || row.cat || "";
        if (value) categories[value] = row.cat || catName(lastReportData, value);
      });
      Object.keys(categories).sort(function (a, b) { return String(categories[a]).localeCompare(String(categories[b])); }).forEach(function (value) {
        options.push({ value: value, label: categories[value] });
      });
    } else if (kind === "sales" && rows.some(function (row) { return row.status || row.paymentStatus; })) {
      reportFilterField = rows.some(function (row) { return row.status; }) ? "status" : "paymentStatus";
      const values = {};
      rows.forEach(function (row) {
        const value = row[reportFilterField];
        if (value) values[String(value)] = String(value).replace(/-/g, " ");
      });
      Object.keys(values).sort().forEach(function (value) { options.push({ value: value, label: values[value] }); });
    }
    $("#reportFilter").html(options.map(function (item) {
      return '<option value="' + Utils.esc(item.value) + '">' + Utils.esc(item.label) + "</option>";
    }).join(""));
    $("#reportFilterBox").toggleClass("hidden", options.length === 1);
  }

  function applyReportFilters() {
    const query = $.trim($("#reportSearch").val()).toLowerCase();
    const selected = $("#reportFilter").val() || "";
    filteredReportRows = reportRows.filter(function (row) {
      const values = cols.map(function (column) {
        const value = row[column.k];
        return column.f ? column.f(value) : value;
      });
      const text = values.concat(Object.keys(row).map(function (key) { return row[key]; })).join(" ").toLowerCase();
      if (query && text.indexOf(query) < 0) return false;
      if (!selected) return true;
      if (reportFilterField === "active") {
        const active = row.active === true || row.active === 1 || String(row.active).toLowerCase() === "true";
        return selected === "active" ? active : !active;
      }
      if (reportFilterField === "category") return String(row.catId || row.cat || "") === selected;
      if (reportFilterField) return String(row[reportFilterField] || "").toLowerCase() === selected.toLowerCase();
      return true;
    });
    pg.setItems(filteredReportRows);
    $("#exportReport").prop("disabled", !filteredReportRows.length);
  }

  function reportCsvRows(rows, columns) {
    return rows.map(function (row) {
      return columns.map(function (column) {
        const value = row[column.k];
        return column.f ? column.f(value) : value;
      });
    });
  }

  let lastReportData = { catMap: {} };

  function renderLocalTable(id, headers, rows, emptyText) {
    const header = "<thead><tr>" + headers.map(function (item) {
      return "<th" + (item.numeric ? ' class="num"' : "") + ">" + Utils.esc(item.label) + "</th>";
    }).join("") + "</tr></thead>";
    const body = rows.length ? rows.map(function (row) {
      return "<tr>" + headers.map(function (item) {
        const value = typeof item.value === "function" ? item.value(row) : row[item.value];
        return "<td" + (item.numeric ? ' class="num"' : "") + ">" + Utils.esc(value) + "</td>";
      }).join("") + "</tr>";
    }).join("") : '<tr><td colspan="' + headers.length + '" class="muted">' + Utils.esc(emptyText) + "</td></tr>";
    $("#" + id).html(header + "<tbody>" + body + "</tbody>");
  }

  function reportDateRange() {
    return {
      from: $("#dFrom").val() ? Utils.dayStart($("#dFrom").val()) : -Infinity,
      to: $("#dTo").val() ? Utils.dayEnd($("#dTo").val()) : Infinity
    };
  }

  let localCustomerRows = [], localInventoryRows = [], localSalesOrders = [];

  function filterLocalCustomers() {
    const query = $.trim($("#localCustomerSearch").val()).toLowerCase();
    const rows = localCustomerRows.filter(function (row) {
      return !query || (row.name + " " + row.email + " " + row.customerId).toLowerCase().indexOf(query) >= 0;
    });
    renderLocalTable("localCustomerTable", [
      { label: "Customer", value: "name" }, { label: "Customer ID", value: "customerId" },
      { label: "Email", value: "email" }, { label: "Orders", value: "orders", numeric: true },
      { label: "Cancelled", value: "cancelled", numeric: true },
      { label: "Purchases (excluding cancelled)", value: function (row) { return money(row.total); }, numeric: true }
    ], rows, "No browser-local purchases in this date range.");
    $("#localCustomerSummary").text(rows.length + " matching customers, " +
      sum(rows, function (row) { return row.cancelled; }) + " cancelled orders, " +
      money(sum(rows, function (row) { return row.total; })) + " purchases excluding cancelled.");
  }

  function renderLocalCustomerReport(range) {
    if (kind !== "customers") return;
    try {
      const byCustomer = {};
      DemoStore.getOrders().filter(function (order) {
        const date = Number(order.orderDate || order.date);
        return date >= range.from && date <= range.to;
      }).forEach(function (order) {
        const id = String(order.customerId || order.customerEmail || order.customerName || "unknown");
        const row = byCustomer[id] || (byCustomer[id] = {
          customerId: order.customerId || "",
          name: order.customerName || "Customer",
          email: order.customerEmail || "",
          orders: 0,
          cancelled: 0,
          total: 0
        });
        row.orders += 1;
        if (String(order.status || order.orderStatus).toLowerCase() === "cancelled") row.cancelled += 1;
        else row.total += Number(order.totalAmount) || 0;
      });
      localCustomerRows = Object.keys(byCustomer).map(function (id) { return byCustomer[id]; })
        .sort(function (a, b) { return b.total - a.total; });
      filterLocalCustomers();
      $("#localCustomerSearch").off(".localReport").on("input.localReport", filterLocalCustomers);
      $("#exportLocalCustomers").off(".localReport").on("click.localReport", function () {
        const query = $.trim($("#localCustomerSearch").val()).toLowerCase();
        const rows = localCustomerRows.filter(function (row) {
          return !query || (row.name + " " + row.email + " " + row.customerId).toLowerCase().indexOf(query) >= 0;
        }).map(function (row) { return [row.name, row.customerId, row.email, row.orders, row.cancelled, row.total]; });
        downloadCsv("browser-local-customer-purchases.csv", ["Customer", "Customer ID", "Email", "Orders", "Cancelled", "Purchases excluding cancelled"], rows);
      });
    } catch (error) {
      $("#localCustomerSummary").html('<span class="error">' + Utils.esc(error.message) + "</span>");
      $("#localCustomerTable").empty();
    }
  }

  function filterLocalInventory() {
    const query = $.trim($("#localInventorySearch").val()).toLowerCase();
    const category = $("#localInventoryCategory").val() || "";
    const rows = localInventoryRows.filter(function (row) {
      const text = [row.id, row.title, row.catId, row.catName].join(" ").toLowerCase();
      return (!query || text.indexOf(query) >= 0) && (!category || row.catId === category);
    });
    renderLocalTable("localInventoryTable", [
      { label: "Product ID", value: "id" }, { label: "Product", value: "title" },
      { label: "Category", value: "catName" }, { label: "Firestore quantity", value: "firestoreQuantity", numeric: true },
      { label: "Browser-local quantity", value: "quantity", numeric: true },
      { label: "Availability", value: function (row) { return row.quantity === 0 ? "Out of stock" : "In stock"; } }
    ], rows, "No browser-local inventory is available.");
    $("#localInventorySummary").text(rows.length + " matching products, " +
      sum(rows, function (row) { return row.quantity; }) + " browser-local units, " +
      rows.filter(function (row) { return row.quantity === 0; }).length + " out of stock.");
  }

  function renderLocalInventoryReport(products, categories) {
    if (kind !== "inventory") return;
    try {
      localInventoryRows = products.map(function (product) {
        const local = DemoStore.applyStock(product);
        return {
          id: local.id,
          title: local.title,
          catId: local.catId || "",
          catName: catName({ catMap: categories }, local.catId || ""),
          firestoreQuantity: Number(product.quantity) || 0,
          quantity: local.quantity
        };
      });
      const categoryOptions = {};
      localInventoryRows.forEach(function (row) { if (row.catId) categoryOptions[row.catId] = row.catName; });
      $("#localInventoryCategory").html('<option value="">All categories</option>' +
        Object.keys(categoryOptions).sort(function (a, b) { return String(categoryOptions[a]).localeCompare(String(categoryOptions[b])); })
          .map(function (id) { return '<option value="' + Utils.esc(id) + '">' + Utils.esc(categoryOptions[id]) + "</option>"; }).join(""));
      filterLocalInventory();
      $("#localInventorySearch, #localInventoryCategory").off(".localReport").on("input.localReport change.localReport", filterLocalInventory);
      $("#exportLocalInventory").off(".localReport").on("click.localReport", function () {
        const query = $.trim($("#localInventorySearch").val()).toLowerCase();
        const category = $("#localInventoryCategory").val() || "";
        const rows = localInventoryRows.filter(function (row) {
          return (!query || [row.id, row.title, row.catId, row.catName].join(" ").toLowerCase().indexOf(query) >= 0) &&
            (!category || row.catId === category);
        }).map(function (row) { return [row.id, row.title, row.catId, row.catName, row.firestoreQuantity, row.quantity, row.quantity === 0 ? "Out of stock" : "In stock"]; });
        downloadCsv("browser-local-inventory.csv", ["Product ID", "Product", "Category ID", "Category", "Firestore quantity", "Browser-local quantity", "Availability"], rows);
      });
    } catch (error) {
      $("#localInventorySummary").html('<span class="error">' + Utils.esc(error.message) + "</span>");
      $("#localInventoryTable").empty();
    }
  }

  function renderLocalSalesReport(from, to) {
    if (kind !== "sales") return;
    try {
      const query = $.trim($("#localSalesSearch").val()).toLowerCase();
      const payment = $("#localSalesPayment").val() || "";
      const status = $("#localSalesStatus").val() || "";
      const allOrders = DemoStore.getOrders();
      localSalesOrders = allOrders.filter(function (order) {
        const date = Number(order.orderDate || order.date);
        const orderStatus = String(order.status || order.orderStatus || "").toLowerCase();
        const productsText = Utils.list(order.items).map(function (item) { return item.productName || item.title || ""; }).join(" ");
        const text = [order.orderId, order.customerId, order.customerName, order.customerEmail, productsText].join(" ").toLowerCase();
        return date >= from && date <= to && (!payment || order.paymentMethod === payment) &&
          (!status || orderStatus === status) && (!query || text.indexOf(query) >= 0);
      });
      const successful = localSalesOrders.filter(function (order) { return String(order.status || order.orderStatus).toLowerCase() !== "cancelled"; });
      const cancelled = localSalesOrders.filter(function (order) { return String(order.status || order.orderStatus).toLowerCase() === "cancelled"; });
      const total = function (list) { return sum(list, function (order) { return Number(order.totalAmount) || 0; }); };
      const codValue = total(successful.filter(function (order) { return order.paymentMethod === "COD"; }));
      const creditOutstanding = total(successful.filter(function (order) {
        return order.paymentMethod === "CREDIT" && String(order.paymentStatus).toLowerCase() === "outstanding";
      }));
      const metric = function (value, label) {
        return '<div class="stat"><div class="v">' + Utils.esc(value) + '</div><div class="l">' + Utils.esc(label) + "</div></div>";
      };
      $("#demoSalesError").empty();
      $("#demoSalesStats").html(metric(localSalesOrders.length, "Matching browser-local orders") +
        metric(money(total(successful)), "Local order value (excluding cancelled)") +
        metric(money(codValue), "COD order value") +
        metric(money(creditOutstanding), "Local credit outstanding") +
        metric(cancelled.length, "Cancelled orders"));

      const products = {};
      successful.forEach(function (order) {
        Utils.list(order.items).forEach(function (item) {
          const id = item.productId || item.productName || item.title || "unknown";
          const row = products[id] || (products[id] = { id: id, name: item.productName || item.title || id, quantity: 0, amount: 0 });
          const quantity = Number(item.quantity) || 0;
          row.quantity += quantity;
          row.amount += Number(item.subtotal) || quantity * (Number(item.unitPrice) || 0);
        });
      });
      const topProducts = Object.keys(products).map(function (id) { return products[id]; })
        .sort(function (a, b) { return b.quantity - a.quantity || b.amount - a.amount; }).slice(0, 10);
      renderLocalTable("demoTopProducts", [
        { label: "Product ID", value: "id" }, { label: "Product", value: "name" },
        { label: "Units sold", value: "quantity", numeric: true }, { label: "Local sales", value: function (row) { return money(row.amount); }, numeric: true }
      ], topProducts, "No product sales for these filters.");

      const customers = {};
      successful.forEach(function (order) {
        const id = order.customerId || order.customerEmail || order.customerName || "unknown";
        const row = customers[id] || (customers[id] = {
          name: order.customerName || "Customer", email: order.customerEmail || "", orderCount: 0, amount: 0
        });
        row.orderCount += 1;
        row.amount += Number(order.totalAmount) || 0;
      });
      const customerRows = Object.keys(customers).map(function (id) { return customers[id]; })
        .sort(function (a, b) { return b.amount - a.amount; });
      renderLocalTable("demoCustomerTotals", [
        { label: "Customer", value: "name" }, { label: "Email", value: "email" },
        { label: "Orders", value: "orderCount", numeric: true }, { label: "Purchase total", value: function (row) { return money(row.amount); }, numeric: true }
      ], customerRows, "No customer purchases for these filters.");

      const salesByDate = {};
      successful.forEach(function (order) {
        const date = new Date(Number(order.orderDate || order.date));
        const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
        const row = salesByDate[key] || (salesByDate[key] = { date: key, orderCount: 0, amount: 0 });
        row.orderCount += 1;
        row.amount += Number(order.totalAmount) || 0;
      });
      renderLocalTable("demoDateSales", [
        { label: "Date", value: "date" }, { label: "Orders", value: "orderCount", numeric: true },
        { label: "Local sales", value: function (row) { return money(row.amount); }, numeric: true }
      ], Object.keys(salesByDate).sort().map(function (key) { return salesByDate[key]; }), "No sales for these filters.");

      renderLocalTable("demoCancelledOrders", [
        { label: "Order ID", value: function (row) { return row.orderId || ""; } },
        { label: "Customer", value: function (row) { return row.customerName || ""; } },
        { label: "Date", value: function (row) { return Utils.date(row.orderDate || row.date); } },
        { label: "Amount", value: function (row) { return money(row.totalAmount); }, numeric: true }
      ], cancelled, "No orders were cancelled for these filters.");
      $("#exportLocalSales").off(".localReport").on("click.localReport", function () {
        const rows = localSalesOrders.map(function (order) {
          const productsText = Utils.list(order.items).map(function (item) {
            return (item.productName || item.title || item.productId || "Product") + " x " + (Number(item.quantity) || 0);
          }).join("; ");
          return [order.orderId || "", order.customerId || "", order.customerName || "", order.customerEmail || "",
            Utils.dateTime(order.orderDate || order.date), productsText, order.subtotal || 0, order.totalAmount || 0,
            order.paymentMethod || "", order.paymentStatus || "", order.orderStatus || order.status || "", order.invoiceNumber || ""];
        });
        downloadCsv("browser-local-sales.csv", ["Order ID", "Customer ID", "Customer", "Email", "Date", "Products", "Subtotal", "Total", "Payment method", "Payment status", "Order status", "Invoice"], rows);
      });
    } catch (error) {
      $("#demoSalesStats").empty();
      $("#demoSalesError").html('<div class="message error">' + Utils.esc(error.message) + "</div>");
    }
  }

  $("#repType").html(Object.keys(REPORTS).map(function (k) { return '<option value="' + k + '">' + Utils.esc(REPORTS[k].label) + "</option>"; }).join(""));
  $("#repType").on("change", function () {
    $(".date-field").toggleClass("hidden", !REPORTS[$(this).val()].dates);
    $("#reportSearch").val("");
  });

  function reportCollections(reportKey) {
    if (kind === "customers") {
      return reportKey === "all"
        ? { required: ["customers"], optional: [] }
        : { required: ["orders"], optional: [] };
    }
    if (kind === "inventory") return { required: ["inventory"], optional: ["categories"] };
    if (kind === "sales" && reportKey === "payments") return { required: ["payments"], optional: [] };
    if (kind === "sales" && reportKey === "category") return { required: ["orders"], optional: ["categories"] };
    if (kind === "sales") return { required: ["orders"], optional: [] };
    return { required: [], optional: [] };
  }

  function loadReportCollections(requirements) {
    const deferred = $.Deferred();
    const values = {}, warnings = [];
    const requests = requirements.required.map(function (name) { return { name: name, required: true }; })
      .concat(requirements.optional.map(function (name) { return { name: name, required: false }; }));
    let remaining = requests.length;
    if (!remaining) {
      deferred.resolve(values, warnings);
      return deferred.promise();
    }
    requests.forEach(function (request) {
      DB.get(request.name).done(function (value) {
        values[request.name] = value;
        remaining -= 1;
        if (!remaining && deferred.state() === "pending") deferred.resolve(values, warnings);
      }).fail(function (error) {
        if (request.required) {
          if (deferred.state() === "pending") deferred.reject(error);
          return;
        }
        warnings.push(error);
        values[request.name] = {};
        remaining -= 1;
        if (!remaining && deferred.state() === "pending") deferred.resolve(values, warnings);
      });
    });
    return deferred.promise();
  }

  function run() {
    const reportKey = $("#repType").val(), def = REPORTS[reportKey], from = $("#dFrom").val(), to = $("#dTo").val();
    if (def.dates && from && to && from > to) { Utils.toast("From date must be on or before To date.", "error"); return; }
    const range = reportDateRange();
    if (kind === "sales") {
      renderLocalSalesReport(def.dates ? range.from : -Infinity, def.dates ? range.to : Infinity);
    }
    if (kind === "customers") renderLocalCustomerReport(range);
    $("#summary").text("Loading...");
    loadReportCollections(reportCollections(reportKey)).done(function (data, warnings) {
      const d = {
        customers: Utils.list(data.customers),
        cust: data.customers || {},
        products: Utils.list(data.inventory),
        orders: Utils.flattenOrders(data.orders),
        payments: Utils.list(data.payments),
        catMap: data.categories || {}
      };
      lastReportData = d;
      if (kind === "inventory") renderLocalInventoryReport(d.products, d.catMap);
      const res = def.run(d, def.dates ? range : { from: -Infinity, to: Infinity });
      currentReportKey = reportKey;
      cols = res.cols;
      reportRows = res.rows;
      configureReportFilter(reportRows);
      const warning = warnings.length
        ? " Category names could not be loaded; category IDs are shown. " + warnings.map(AuthAPI.friendlyError).join(" ")
        : "";
      $("#summary").text(def.label + ": " + res.summary + warning);
      applyReportFilters();
    }).fail(function (error) {
      $("#summary").text("Report data could not be loaded.");
      reportRows = [];
      filteredReportRows = [];
      $("#exportReport").prop("disabled", true);
      Utils.toast(AuthAPI.friendlyError(error), "error");
    });
  }
  $("#runBtn").on("click", run);
  $("#reportSearch, #reportFilter").on("input change", applyReportFilters);
  $("#exportReport").on("click", function () {
    const filePart = String(currentReportKey || "report").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    downloadCsv("firestore-" + kind + "-" + filePart + ".csv", cols.map(function (column) { return column.l; }),
      reportCsvRows(filteredReportRows, cols));
  });
  $("#localSalesSearch").on("input", function () { const range = reportDateRange(); renderLocalSalesReport(range.from, range.to); });
  $("#localSalesPayment, #localSalesStatus").on("change", function () { const range = reportDateRange(); renderLocalSalesReport(range.from, range.to); });
  $("#repType").trigger("change"); run();
});
