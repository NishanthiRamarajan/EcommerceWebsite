/* demo-store.js - browser-local orders, stock, and credit. */
const DemoStore = {
  ORDERS_KEY: "demo_orders",
  INVENTORY_KEY: "demo_inventory",
  CREDIT_KEY: "demo_credit",
  NOTIFICATIONS_KEY: "demo_notifications",

  _read: function (key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      throw new Error("Browser storage is unavailable: " + error.message);
    }
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error("Saved browser data is unreadable. The stored value was not changed.");
    }
  },

  _writeState: function (changes) {
    const keys = Object.keys(changes), previous = {}, serialized = {}, written = [];
    try {
      keys.forEach(function (key) {
        previous[key] = localStorage.getItem(key);
        serialized[key] = JSON.stringify(changes[key]);
        if (serialized[key] === undefined) throw new Error("Browser data could not be serialized.");
      });
    } catch (error) {
      throw new Error("Browser data could not be prepared for storage: " + error.message);
    }

    try {
      keys.forEach(function (key) {
        localStorage.setItem(key, serialized[key]);
        written.push(key);
      });
    } catch (error) {
      let rollbackError = null;
      written.reverse().forEach(function (key) {
        try {
          if (previous[key] === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous[key]);
        } catch (restoreError) {
          rollbackError = restoreError;
        }
      });
      if (rollbackError) {
        throw new Error("Browser data could not be saved or fully restored. Storage failed: " + rollbackError.message);
      }
      throw new Error("Data could not be saved to this browser: " + error.message);
    }
  },

  _inventory: function () {
    const inventory = DemoStore._read(DemoStore.INVENTORY_KEY, {});
    if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
      throw new Error("Saved browser-local stock data has an invalid format.");
    }
    Object.keys(inventory).forEach(function (id) {
      if (!Number.isSafeInteger(inventory[id]) || inventory[id] < 0) {
        throw new Error("Saved browser-local stock is invalid for product " + id + ".");
      }
    });
    return inventory;
  },

  _credits: function () {
    const credits = DemoStore._read(DemoStore.CREDIT_KEY, {});
    if (!credits || typeof credits !== "object" || Array.isArray(credits)) {
      throw new Error("Saved browser-local credit data has an invalid format.");
    }
    Object.keys(credits).forEach(function (uid) {
      const record = credits[uid];
      if (!record || !Number.isSafeInteger(record.creditLimit) || record.creditLimit < 0 ||
          !Number.isSafeInteger(record.creditUsed) || record.creditUsed < 0) {
        throw new Error("Saved browser-local credit is invalid for customer " + uid + ".");
      }
    });
    return credits;
  },

  getOrders: function () {
    const orders = DemoStore._read(DemoStore.ORDERS_KEY, []);
    if (!Array.isArray(orders)) throw new Error("Saved browser-local orders have an invalid format.");
    return orders;
  },

  getNotifications: function () {
    const notifications = DemoStore._read(DemoStore.NOTIFICATIONS_KEY, []);
    if (!Array.isArray(notifications)) throw new Error("Saved browser-local notifications have an invalid format.");
    return notifications;
  },

  setNotificationRead: function (notificationId, read) {
    if (typeof read !== "boolean") throw new Error("A notification read state is required.");
    const notifications = DemoStore.getNotifications();
    const item = notifications.filter(function (notification) { return notification.id === notificationId; })[0];
    if (!item) throw new Error("Browser-local notification not found.");
    if (item.read === read) return false;
    item.read = read;
    DemoStore._writeState({ [DemoStore.NOTIFICATIONS_KEY]: notifications });
    return true;
  },

  markNotificationRead: function (notificationId) {
    return DemoStore.setNotificationRead(notificationId, true);
  },

  markNotificationUnread: function (notificationId) {
    return DemoStore.setNotificationRead(notificationId, false);
  },

  markAllNotificationsRead: function () {
    const notifications = DemoStore.getNotifications();
    let updated = 0;
    notifications.forEach(function (notification) {
      if (!notification.read) {
        notification.read = true;
        updated += 1;
      }
    });
    if (updated) DemoStore._writeState({ [DemoStore.NOTIFICATIONS_KEY]: notifications });
    return updated;
  },

  deleteNotification: function (notificationId) {
    const notifications = DemoStore.getNotifications();
    const remaining = notifications.filter(function (notification) { return notification.id !== notificationId; });
    if (remaining.length === notifications.length) throw new Error("Browser-local notification not found.");
    DemoStore._writeState({ [DemoStore.NOTIFICATIONS_KEY]: remaining });
    return true;
  },

  getOrdersForCustomer: function (uid) {
    return DemoStore.getOrders().filter(function (order) {
      return order.customerId === uid;
    });
  },

  stockFor: function (productId, firestoreQuantity) {
    const inventory = DemoStore._inventory();
    if (Object.prototype.hasOwnProperty.call(inventory, productId)) return inventory[productId];
    const quantity = Number(firestoreQuantity);
    return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0;
  },

  applyStock: function (product) {
    const copy = $.extend({}, product);
    copy.quantity = DemoStore.stockFor(product.id, product.quantity);
    return copy;
  },

  creditFor: function (uid, firestoreLimit) {
    if (!uid) throw new Error("A signed-in customer is required for browser-local credit.");
    const credits = DemoStore._credits();
    const limit = Number(firestoreLimit);
    if (!Number.isSafeInteger(limit) || limit < 0) {
      throw new Error("The customer's credit limit is invalid.");
    }
    if (!Object.prototype.hasOwnProperty.call(credits, uid)) {
      credits[uid] = { creditLimit: limit, creditUsed: 0 };
      DemoStore._writeState({ [DemoStore.CREDIT_KEY]: credits });
    } else if (credits[uid].creditLimit !== limit) {
      credits[uid].creditLimit = limit;
      DemoStore._writeState({ [DemoStore.CREDIT_KEY]: credits });
    }
    return $.extend({}, credits[uid]);
  },

  createOrder: function (draft, catalog, firestoreCreditLimit) {
    const orders = DemoStore.getOrders();
    const customerId = String(draft && draft.customerId || "");
    const requestId = String(draft && draft.requestId || "");
    const orderId = String(draft && draft.orderId || "");
    if (!customerId || !requestId || !orderId) throw new Error("The browser-local order is missing its customer or unique ID.");

    const existingRequest = orders.filter(function (order) {
      return order.requestId === requestId;
    })[0];
    if (existingRequest) {
      if (existingRequest.customerId !== customerId) throw new Error("This checkout request belongs to another customer.");
      return { order: existingRequest, alreadyExists: true };
    }
    if (orders.some(function (order) { return order.orderId === orderId; })) {
      throw new Error("Duplicate order ID. Please try checkout again.");
    }

    const method = String(draft.paymentMethod || "").toUpperCase();
    if (method !== "COD" && method !== "CREDIT") throw new Error("Choose Cash on Delivery or store credit.");
    if (!Array.isArray(draft.items) || !draft.items.length || draft.items.length > 30) {
      throw new Error("Your cart must contain between 1 and 30 products.");
    }

    const inventory = DemoStore._inventory(), nextInventory = $.extend({}, inventory);
    const seen = Object.create(null);
    let subtotal = 0, totalQuantity = 0;
    const items = draft.items.map(function (line) {
      const productId = String(line && line.productId || "");
      const quantity = Number(line && line.quantity);
      const product = catalog && catalog[productId];
      if (!productId || seen[productId]) throw new Error("Your cart contains an invalid or duplicate product.");
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Product quantities must be positive whole numbers.");
      if (!product || product.active !== true) throw new Error("A product in your cart is no longer available.");

      const available = Object.prototype.hasOwnProperty.call(inventory, productId)
        ? inventory[productId]
        : DemoStore.stockFor(productId, product.quantity);
      if (quantity > available) throw new Error("Requested quantity is not available.");
      if (!Number.isSafeInteger(product.price) || product.price < 1) throw new Error("A product price is invalid.");

      const lineTotal = product.price * quantity;
      if (!Number.isSafeInteger(lineTotal)) throw new Error("A product subtotal is invalid.");
      seen[productId] = true;
      nextInventory[productId] = available - quantity;
      subtotal += lineTotal;
      totalQuantity += quantity;
      if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(totalQuantity)) {
        throw new Error("The order total is invalid.");
      }
      return {
        productId: productId,
        productName: product.title,
        catId: product.catId || "",
        imageUrl: product.imageUrl || "",
        quantity: quantity,
        unitPrice: product.price,
        subtotal: lineTotal
      };
    });
    if (subtotal < 1) throw new Error("The order total is invalid.");

    const notifications = DemoStore.getNotifications();
    let nextCredits = null;
    if (method === "CREDIT") {
      const credit = DemoStore.creditFor(customerId, firestoreCreditLimit);
      const availableCredit = Math.max(0, credit.creditLimit - credit.creditUsed);
      if (subtotal > availableCredit) throw new Error("Insufficient browser-local credit balance.");
      nextCredits = DemoStore._credits();
      nextCredits[customerId].creditUsed += subtotal;
    }

    const orderDate = Number.isSafeInteger(draft.orderDate) ? draft.orderDate : Date.now();
    const invoiceNumber = String(draft.invoiceNumber || ("LOCAL-" + orderId.slice(-8).toUpperCase()));
    const order = {
      orderId: orderId,
      requestId: requestId,
      customerId: customerId,
      customerName: String(draft.customerName || ""),
      customerEmail: String(draft.customerEmail || ""),
      orderDate: orderDate,
      date: orderDate,
      items: items,
      totalQuantity: totalQuantity,
      subtotal: subtotal,
      totalAmount: subtotal,
      paymentMethod: method,
      paymentStatus: method === "COD" ? "Pending" : "Outstanding",
      orderStatus: "Placed",
      status: "pending",
      paymentType: method === "COD" ? "cash" : "credit",
      invoiceNumber: invoiceNumber,
      billNumber: invoiceNumber,
      shippingAddress: {
        name: String(draft.shippingAddress && draft.shippingAddress.name || ""),
        mobile: String(draft.shippingAddress && draft.shippingAddress.mobile || ""),
        address: String(draft.shippingAddress && draft.shippingAddress.address || ""),
        city: String(draft.shippingAddress && draft.shippingAddress.city || ""),
        postalCode: String(draft.shippingAddress && draft.shippingAddress.postalCode || "")
      },
      demoOnly: true,
      stockRestored: false,
      creditRestored: false
    };

    const nextOrders = orders.concat([order]);
    const notification = {
      id: "DEMO-MSG-" + orderId,
      message: "New browser-local order " + orderId + " from " + order.customerName + " for " + subtotal + " rupees.",
      createdAt: orderDate,
      read: false,
      demoOnly: true,
      orderId: orderId
    };
    const changes = {};
    changes[DemoStore.INVENTORY_KEY] = nextInventory;
    changes[DemoStore.ORDERS_KEY] = nextOrders;
    changes[DemoStore.NOTIFICATIONS_KEY] = notifications.concat([notification]);
    if (method === "CREDIT") changes[DemoStore.CREDIT_KEY] = nextCredits;
    DemoStore._writeState(changes);
    return { order: order, alreadyExists: false };
  },

  updateOrderStatus: function (orderId, nextStatus) {
    const orders = DemoStore.getOrders();
    const orderIndex = orders.findIndex(function (order) { return order.orderId === orderId; });
    if (orderIndex < 0) throw new Error("Browser-local order not found.");
    const order = orders[orderIndex];
    const current = String(order.orderStatus || "").toLowerCase();
    const next = String(nextStatus || "").toLowerCase();
    const allowed = {
      placed: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: []
    };
    if (current === next) return false;
    if (!allowed[current] || allowed[current].indexOf(next) < 0) {
      throw new Error("That order status change is not allowed.");
    }

    const updated = $.extend({}, order, {
      orderStatus: next.charAt(0).toUpperCase() + next.slice(1),
      status: next,
      updatedAt: Date.now()
    });
    const changes = {};
    if (next === "cancelled") {
      if (!updated.stockRestored) {
        const inventory = DemoStore._inventory();
        updated.items.forEach(function (item) {
          const currentStock = Object.prototype.hasOwnProperty.call(inventory, item.productId) ? inventory[item.productId] : 0;
          const restored = currentStock + item.quantity;
          if (!Number.isSafeInteger(restored)) throw new Error("Browser-local stock could not be restored for " + item.productName + ".");
          inventory[item.productId] = restored;
        });
        updated.stockRestored = true;
        changes[DemoStore.INVENTORY_KEY] = inventory;
      }
      if (order.paymentMethod === "CREDIT" && !updated.creditRestored) {
        const credits = DemoStore._credits(), credit = credits[order.customerId];
        if (!credit || credit.creditUsed < order.totalAmount) {
          throw new Error("Browser-local credit usage could not be safely reversed.");
        }
        credit.creditUsed -= order.totalAmount;
        updated.creditRestored = true;
        changes[DemoStore.CREDIT_KEY] = credits;
      }
      updated.paymentStatus = "Cancelled";
    }
    orders[orderIndex] = updated;
    changes[DemoStore.ORDERS_KEY] = orders;
    DemoStore._writeState(changes);
    return true;
  },

  setStock: function (productId, quantity) {
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error("Browser-local stock must be a non-negative whole number.");
    }
    const inventory = DemoStore._inventory();
    inventory[productId] = quantity;
    DemoStore._writeState({ [DemoStore.INVENTORY_KEY]: inventory });
  },

  removeStock: function (productId) {
    const inventory = DemoStore._inventory();
    if (!Object.prototype.hasOwnProperty.call(inventory, productId)) return;
    delete inventory[productId];
    DemoStore._writeState({ [DemoStore.INVENTORY_KEY]: inventory });
  }
};
