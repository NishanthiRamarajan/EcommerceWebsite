/* checkout.js - browser-local checkout saved in LocalStorage. */
$(function () {
  if (!$("#checkoutPage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  if (Session.isAdmin()) {
    $("#checkoutPage").html('<h1>Checkout</h1><div class="empty"><h3>Admin accounts cannot place orders</h3><p class="muted">Log in with a customer account.</p></div>');
    return;
  }

  const session = Session.get();
  const requestId = Utils.newId("REQ");
  let profile = null, cartItems = [], orderTotal = 0, availableCredit = 0, submitting = false;

  function showError(message) {
    Utils.showMessage("#coMsg", message, "error");
  }

  function showStorageError(error) {
    showError(error && error.message ? error.message : "Checkout could not access this browser's storage.");
  }

  function blockCheckout(message) {
    showError(message);
    $("#coBody").html('<div class="empty"><h3>Review your cart</h3><p class="muted">Update unavailable products or quantities before continuing.</p><a class="btn" href="cart.html">Return to cart</a></div>');
  }

  function methodLabel(method) {
    return method === "CREDIT" ? "Store credit (simulated)" : "Cash on Delivery";
  }

  function render() {
    if (!cartItems.length) {
      $("#coItems").html('<div class="empty"><h3>Your cart is empty</h3><a class="btn" href="products.html">Browse products</a></div>');
      $("#coSummary").empty();
      return;
    }

    $("#coItems").html('<div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Subtotal</th></tr></thead><tbody>' +
      cartItems.map(function (item) {
        return "<tr><td>" + Utils.esc(item.title) + "</td><td class=\"num\">" + item.qty + "</td><td class=\"num\">" +
          Utils.money(item.price * item.qty) + "</td></tr>";
      }).join("") + "</tbody></table></div>");

    const selected = $('input[name="pay"]:checked').val() || "COD";
    $("#coSummary").html("<h2>Payment summary</h2><div class=\"sum-row\"><span>Items</span><span>" + cartItems.reduce(function (sum, item) { return sum + item.qty; }, 0) +
      "</span></div><div class=\"sum-row\"><span>Method</span><span>" + Utils.esc(methodLabel(selected)) +
      "</span></div><div class=\"sum-row total\"><span>Order total</span><span>" + Utils.money(orderTotal) +
      "</span></div><button class=\"btn btn-block\" id=\"placeOrder\" type=\"submit\">Place order</button><a class=\"btn btn-ghost btn-block\" href=\"cart.html\">Back to cart</a>");

    if (selected === "CREDIT") {
      $("#creditBox").removeClass("hidden").text("Available browser-local credit: " + Utils.money(availableCredit) +
        (orderTotal > availableCredit ? ". This order exceeds your available browser-local credit." : "."));
      $("#placeOrder").prop("disabled", orderTotal > availableCredit || submitting);
    } else {
      $("#creditBox").addClass("hidden").text("");
      $("#placeOrder").prop("disabled", submitting);
    }
  }

  function buildDemoCatalog(inventory) {
    const catalog = {};
    Utils.list(inventory).forEach(function (product) {
      catalog[product.id] = DemoStore.applyStock(product);
    });
    return catalog;
  }

  function showIssues(issues) {
    $("#coMsg").html(issues.map(function (issue) {
      return '<div class="message info">' + Utils.esc(issue.msg) + "</div>";
    }).join(""));
  }

  function loadCheckout() {
    $.when(DB.get("customers/" + session.uid), DB.get("inventory"), DB.get("categories")).done(function (customer, inventory, categories) {
      try {
        if (!customer || customer.active !== true) {
          showError("An active customer profile is required to place an order. Contact the store admin.");
          $("#coBody").addClass("hidden");
          return;
        }
        profile = customer;
        $("#recipientName").val(customer.name || "");
        $("#deliveryMobile").val(customer.mobile || "");

        const catalog = buildDemoCatalog(inventory || {});
        const validation = Cart.validate(catalog, categories || {});
        cartItems = validation.items;
        orderTotal = Cart.total(cartItems);
        const creditLimit = customer.creditLimit == null ? 0 : Number(customer.creditLimit);
        const credit = DemoStore.creditFor(session.uid, creditLimit);
        availableCredit = Math.max(0, credit.creditLimit - credit.creditUsed);
        showIssues(validation.issues);
        if (validation.blocked) {
          blockCheckout("Remove unavailable or out-of-stock products from your cart before placing this order.");
          return;
        }
        render();
      } catch (error) {
        showStorageError(error);
        $("#coBody").addClass("hidden");
      }
    }).fail(function (error) {
      showError(AuthAPI.friendlyError(error));
      $("#coBody").addClass("hidden");
    });
  }

  $("input[name='pay']").on("change", render);

  $("#checkoutForm").on("submit", function (event) {
    event.preventDefault();
    if (submitting) {
      Utils.toast("Your order is already being processed.", "info");
      return;
    }
    if (!profile || !cartItems.length) {
      Utils.toast("Your cart is empty. Add products before checkout.", "error");
      return;
    }

    const address = {
      name: $.trim($("#recipientName").val()),
      mobile: $.trim($("#deliveryMobile").val()),
      address: $.trim($("#deliveryAddress").val()),
      city: $.trim($("#deliveryCity").val()),
      postalCode: $.trim($("#deliveryPin").val())
    };
    const addressErrors = {};
    if (address.name.length < 2) addressErrors.recipientName = "Enter the recipient name.";
    if (!Validate.mobile(address.mobile)) addressErrors.deliveryMobile = "Enter a valid 10-digit mobile number.";
    if (address.address.length < 8) addressErrors.deliveryAddress = "Enter a complete delivery address.";
    if (address.city.length < 2) addressErrors.deliveryCity = "Enter a city.";
    if (!/^\d{6}$/.test(address.postalCode)) addressErrors.deliveryPin = "Enter a valid 6-digit PIN code.";
    Utils.showFieldErrors(addressErrors, "#checkoutForm");
    if (Object.keys(addressErrors).length) return;

    submitting = true;
    Utils.clearMessage("#coMsg");
    Utils.setLoading($("#placeOrder"), true, "Validating order...");
    const paymentMethod = $('input[name="pay"]:checked').val() || "COD";

    $.when(DB.get("inventory"), DB.get("categories"), DB.get("customers/" + session.uid)).done(function (inventory, categories, customer) {
      try {
        if (!customer || customer.active !== true) throw new Error("An active customer profile is required to place an order.");
        profile = customer;
        const catalog = buildDemoCatalog(inventory || {});
        const validation = Cart.validate(catalog, categories || {});
        cartItems = validation.items;
        orderTotal = Cart.total(cartItems);
        const creditLimit = customer.creditLimit == null ? 0 : Number(customer.creditLimit);
        const credit = DemoStore.creditFor(session.uid, creditLimit);
        availableCredit = Math.max(0, credit.creditLimit - credit.creditUsed);
        if (validation.blocked) {
          submitting = false;
          blockCheckout("Requested quantity is not available, or a product is no longer active. Update your cart and try again.");
          return;
        }
        if (validation.changed) {
          showIssues(validation.issues);
          Utils.toast("Your cart changed to match current prices or browser-local stock. Review it and place the order again.", "info");
          submitting = false;
          render();
          return;
        }
        if (!cartItems.length) {
          showError("Your cart is empty. Add products before checkout.");
          submitting = false;
          render();
          return;
        }
        if (paymentMethod === "CREDIT" && orderTotal > availableCredit) {
          showError("Insufficient browser-local credit balance.");
          submitting = false;
          render();
          return;
        }

        const result = DemoStore.createOrder({
          customerId: session.uid,
          customerName: customer.name || session.email,
          customerEmail: customer.email || session.email,
          requestId: requestId,
          orderId: Utils.newId("ORD"),
          paymentMethod: paymentMethod,
          items: cartItems.map(function (item) {
            return { productId: item.productId, quantity: item.qty };
          }),
          shippingAddress: address
        }, catalog, creditLimit);
        const order = result.order;
        let cartClearFailed = false;
        try {
          Cart.clear();
        } catch (error) {
          cartClearFailed = true;
        }
        location.href = "order-confirmation.html?orderId=" + encodeURIComponent(order.orderId) +
          (cartClearFailed ? "&cartClear=failed" : "");
      } catch (error) {
        submitting = false;
        showStorageError(error);
        render();
      }
    }).fail(function (error) {
      submitting = false;
      showError(AuthAPI.friendlyError(error));
      render();
    });
  });

  loadCheckout();
});
