/* database-api.js - Firestore REST API, with the existing DB.* interface retained for app callers. */
const DB = {
  _encodeValue: function (value) {
    if (value === null) return { nullValue: null };
    if (typeof value === "boolean") return { booleanValue: value };
    if (typeof value === "number") {
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    }
    if (typeof value === "string") return { stringValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(DB._encodeValue) } };
    const fields = {};
    Object.keys(value || {}).forEach(function (key) { fields[key] = DB._encodeValue(value[key]); });
    return { mapValue: { fields: fields } };
  },

  _decodeValue: function (value) {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.integerValue !== undefined) return Number(value.integerValue);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.nullValue !== undefined) return null;
    if (value.timestampValue !== undefined) return value.timestampValue;
    if (value.arrayValue) return (value.arrayValue.values || []).map(DB._decodeValue);
    if (value.mapValue) return DB._decodeFields(value.mapValue.fields || {});
    return null;
  },

  _decodeFields: function (fields) {
    const data = {};
    Object.keys(fields || {}).forEach(function (key) { data[key] = DB._decodeValue(fields[key]); });
    return data;
  },

  _document: function (doc) {
    const id = doc.name.split("/").pop(), data = DB._decodeFields(doc.fields || {});
    if (data.id === undefined) data.id = id;
    return data;
  },

  _resourceName: function (path) {
    return "projects/" + FIREBASE_CONFIG.projectId +
      "/databases/(default)/documents/" + path;
  },

  _isMissingDocument: function (error) {
    const body = error && error.responseJSON && error.responseJSON.error;
    const message = body && body.message;
    return error && error.status === 404 && typeof message === "string"
      && message.indexOf("Document") === 0 && message.indexOf("not found") > -1;
  },

  _resolvePath: function (path) {
    const parts = String(path || "").split("/").filter(Boolean);
    if (parts[0] === "orders") {
      if (parts.length === 1) return { kind: "collection", path: "orders", groupOrders: true };
      if (parts.length === 2) return { kind: "collection", path: "orders", customerId: parts[1] };
      return {
        kind: parts.length > 3 ? "field" : "document",
        path: "orders/" + parts[2],
        field: parts.slice(3).join(".")
      };
    }
    if (parts[0] === "wishlists" && parts.length >= 2) {
      if (parts.length === 2) return { kind: "collection", path: "wishlists/" + parts[1] + "/products", wishlist: true };
      return { kind: "document", path: "wishlists/" + parts[1] + "/products/" + parts[2], wishlist: true };
    }
    if (parts.length >= 3) {
      return { kind: "field", path: parts[0] + "/" + parts[1], field: parts.slice(2).join(".") };
    }
    const firestorePath = parts.join("/");
    if (parts.length % 2 === 0) return { kind: "document", path: firestorePath };
    return { kind: "collection", path: firestorePath };
  },

  _withToken: function (method, url, body) {
    const d = $.Deferred();
    function send(token) {
      const options = { url: url, method: method, dataType: "json" };
      if (token) options.headers = { Authorization: "Bearer " + token };
      if (body !== undefined) {
        options.contentType = "application/json";
        options.data = JSON.stringify(body);
      }
      $.ajax(options).done(function (data) { d.resolve(data); }).fail(function (xhr) { d.reject(xhr); });
    }
    if (Session.get()) AuthAPI.getValidToken().done(send).fail(function (error) { d.reject(error); });
    else send(null);
    return d.promise();
  },

  _collection: function (path, query) {
    const d = $.Deferred(), docs = [];
    function consumePage(token) {
      const params = { pageSize: 1000, key: FIREBASE_CONFIG.apiKey };
      if (token) params.pageToken = token;
      const url = FIRESTORE_BASE + "/" + path + "?" + $.param(params);
      DB._withToken("GET", url).done(function (result) {
        (result.documents || []).forEach(function (doc) { docs.push(DB._document(doc)); });
        if (result.nextPageToken) consumePage(result.nextPageToken);
        else d.resolve(docs);
      }).fail(function (error) { d.reject(error); });
    }
    if (!query) consumePage(null);
    else {
      const body = { structuredQuery: { from: [{ collectionId: path.split("/").pop() }] } };
      if (query.customerId !== undefined || query.equalTo !== undefined) {
        const field = query.customerId !== undefined ? "customerId" : query.orderBy;
        const value = query.customerId !== undefined ? query.customerId : query.equalTo;
        body.structuredQuery.where = { fieldFilter: {
          field: { fieldPath: field }, op: "EQUAL", value: DB._encodeValue(value)
        } };
      }
      if (query.orderBy && query.orderBy !== "$key") {
        body.structuredQuery.orderBy = [{ field: { fieldPath: query.orderBy }, direction: "ASCENDING" }];
      }
      const limit = query.limitToFirst !== undefined ? query.limitToFirst : query.limitToLast;
      if (limit !== undefined) body.structuredQuery.limit = Number(limit);
      if (query.startAt !== undefined) body.structuredQuery.startAt = { values: [DB._encodeValue(query.startAt)], before: true };
      if (query.endAt !== undefined) body.structuredQuery.endAt = { values: [DB._encodeValue(query.endAt)], before: false };
      DB._withToken("POST", FIRESTORE_BASE + ":runQuery?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey), body).done(function (rows) {
        rows.forEach(function (row) { if (row.document) docs.push(DB._document(row.document)); });
        d.resolve(docs);
      }).fail(function (error) { d.reject(error); });
    }
    return d.promise();
  },

  _asMap: function (docs, route) {
    const result = {};
    docs.forEach(function (doc) {
      if (route.groupOrders) {
        const uid = doc.customerId;
        if (uid) {
          if (!result[uid]) result[uid] = {};
          result[uid][doc.orderId || doc.id] = doc;
        }
      } else if (route.wishlist) result[doc.id] = doc.value === true;
      else result[doc.id] = doc;
    });
    return result;
  },

  get: function (path, params) {
    const route = DB._resolvePath(path), d = $.Deferred();
    if (route.kind === "collection") {
      DB._collection(route.path, route.customerId !== undefined ? { customerId: route.customerId } : params)
        .done(function (docs) { d.resolve(DB._asMap(docs, route)); }).fail(function (error) { d.reject(error); });
      return d.promise();
    }
    const url = FIRESTORE_BASE + "/" + route.path + "?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey);
    DB._withToken("GET", url).done(function (doc) {
      const data = DB._document(doc);
      if (route.field) {
        const value = route.field.split(".").reduce(function (obj, key) { return obj == null ? undefined : obj[key]; }, data);
        d.resolve(value === undefined ? null : value);
      } else if (route.wishlist) d.resolve(data.value === true);
      else d.resolve(data);
    }).fail(function (error) {
      if (DB._isMissingDocument(error)) d.resolve(null);
      else d.reject(error);
    });
    return d.promise();
  },

  query: function (path, options) {
    const route = DB._resolvePath(path), d = $.Deferred();
    DB._collection(route.path, options || {}).done(function (docs) {
      d.resolve(DB._asMap(docs, route));
    }).fail(function (error) { d.reject(error); });
    return d.promise();
  },

  _commit: function (writes) {
    return DB._withToken("POST", FIRESTORE_BASE + ":commit?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey), { writes: writes });
  },

  _transactionDocumentPath: function (path) {
    const parts = String(path || "").split("/").filter(Boolean);
    if (!parts.length || parts.length % 2 !== 0 || parts.some(function (part) {
      return part === "." || part === ".." || /[?#]/.test(part);
    })) {
      throw new Error("A Firestore transaction read requires a document path.");
    }
    return parts.join("/");
  },

  beginTransaction: function () {
    if (!Session.get()) return $.Deferred().reject("NOT_LOGGED_IN").promise();
    return DB._withToken("POST", FIRESTORE_BASE + ":beginTransaction?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey), {
      options: { readWrite: {} }
    });
  },

  getInTransaction: function (path, transaction) {
    const deferred = $.Deferred();
    let documentPath;
    try {
      documentPath = DB._transactionDocumentPath(path);
    } catch (error) {
      deferred.reject(error);
      return deferred.promise();
    }
    if (!Session.get()) {
      deferred.reject("NOT_LOGGED_IN");
      return deferred.promise();
    }
    if (typeof transaction !== "string" || !transaction) {
      deferred.reject(new Error("A Firestore transaction token is required."));
      return deferred.promise();
    }

    const url = FIRESTORE_BASE + "/" + documentPath + "?" + $.param({
      transaction: transaction,
      key: FIREBASE_CONFIG.apiKey
    });
    DB._withToken("GET", url).done(function (document) {
      deferred.resolve(DB._document(document));
    }).fail(function (error) {
      if (DB._isMissingDocument(error)) deferred.resolve(null);
      else deferred.reject(error);
    });
    return deferred.promise();
  },

  commitTransaction: function (transaction, writes) {
    if (!Session.get()) return $.Deferred().reject("NOT_LOGGED_IN").promise();
    if (typeof transaction !== "string" || !transaction || !Array.isArray(writes) || !writes.length) {
      return $.Deferred().reject(new Error("A transaction token and at least one Firestore write are required.")).promise();
    }
    return DB._withToken("POST", FIRESTORE_BASE + ":commit?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey), {
      transaction: transaction,
      writes: writes
    });
  },

  rollbackTransaction: function (transaction) {
    if (!Session.get()) return $.Deferred().reject("NOT_LOGGED_IN").promise();
    if (typeof transaction !== "string" || !transaction) {
      return $.Deferred().reject(new Error("A transaction token is required.")).promise();
    }
    return DB._withToken("POST", FIRESTORE_BASE + ":rollback?key=" + encodeURIComponent(FIREBASE_CONFIG.apiKey), {
      transaction: transaction
    });
  },

  _updateWrite: function (documentPath, fields, mask) {
    const encoded = {};
    Object.keys(fields || {}).forEach(function (key) { encoded[key] = DB._encodeValue(fields[key]); });
    return {
      update: { name: DB._resourceName(documentPath), fields: encoded },
      updateMask: { fieldPaths: mask || Object.keys(fields || {}) }
    };
  },

  _createWrite: function (documentPath, data) {
    const fields = {};
    Object.keys(data || {}).forEach(function (key) { fields[key] = DB._encodeValue(data[key]); });
    return {
      update: { name: DB._resourceName(documentPath), fields: fields },
      currentDocument: { exists: false }
    };
  },

  _updatesToWrites: function (updates) {
    const documents = {};
    Object.keys(updates || {}).forEach(function (path) {
      const route = DB._resolvePath(path), entry = documents[route.path] || { fields: {}, mask: [], replace: false };
      if (route.kind === "field") {
        entry.fields[route.field] = updates[path];
        if (entry.mask.indexOf(route.field) < 0) entry.mask.push(route.field);
      } else {
        entry.fields = updates[path] || {};
        entry.mask = Object.keys(entry.fields);
        entry.replace = true;
      }
      documents[route.path] = entry;
    });
    return Object.keys(documents).map(function (path) {
      const entry = documents[path];
      if (entry.replace) {
        const encoded = {};
        Object.keys(entry.fields).forEach(function (key) { encoded[key] = DB._encodeValue(entry.fields[key]); });
        return { update: { name: DB._resourceName(path), fields: encoded } };
      }
      return DB._updateWrite(path, entry.fields, entry.mask);
    });
  },

  createMany: function (documents) {
    const writes = (documents || []).map(function (doc) { return DB._createWrite(doc.path, doc.data); });
    return DB._commit(writes);
  },

  writeBatch: function (updates, creates) {
    const writes = DB._updatesToWrites(updates);
    (creates || []).forEach(function (doc) { writes.push(DB._createWrite(doc.path, doc.data)); });
    return DB._commit(writes);
  },

  put: function (path, data) {
    const route = DB._resolvePath(path);
    if (route.kind === "field") return DB._commit([DB._updateWrite(route.path, (function () { const fields = {}; fields[route.field] = data; return fields; })(), [route.field])]);
    if (route.wishlist) data = { value: data === true };
    const fields = {};
    Object.keys(data || {}).forEach(function (key) { fields[key] = DB._encodeValue(data[key]); });
    return DB._commit([{ update: { name: DB._resourceName(route.path), fields: fields } }]);
  },

  patch: function (path, data) {
    const route = DB._resolvePath(path);
    if (route.kind === "field") return DB._commit([DB._updateWrite(route.path, (function () { const fields = {}; fields[route.field] = data; return fields; })(), [route.field])]);
    return DB._commit([DB._updateWrite(route.path, data, Object.keys(data || {}))]);
  },

  post: function (path, data) {
    const route = DB._resolvePath(path);
    const id = "D" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return DB.createMany([{ path: route.path + "/" + id, data: data }]).then(function () { return { name: id }; });
  },

  remove: function (path) {
    const route = DB._resolvePath(path);
    if (route.kind === "field") {
      return DB._commit([{ update: { name: DB._resourceName(route.path), fields: {} }, updateMask: { fieldPaths: [route.field] } }]);
    }
    return DB._commit([{ delete: DB._resourceName(route.path) }]);
  },

  multiUpdate: function (updates) {
    return DB._commit(DB._updatesToWrites(updates));
  }
};

const DemoCheckout = {
  _error: function (message) {
    return { status: 400, responseJSON: { error: { message: message } } };
  },

  _id: function (prefix, requestId) {
    return prefix + "_" + requestId.replace(/[^A-Za-z0-9_-]/g, "_");
  },

  createOrder: function (request) {
    const deferred = $.Deferred(), session = Session.get();
    if (!session || Session.isAdmin()) {
      deferred.reject(DemoCheckout._error("Sign in with a customer account to place an order."));
      return deferred.promise();
    }

    const requestId = String(request.requestId || "");
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
      deferred.reject(DemoCheckout._error("Refresh checkout and try again."));
      return deferred.promise();
    }
    const orderId = DemoCheckout._id("ORD", requestId);
    const paymentId = DemoCheckout._id("PAY", requestId);
    const notificationId = DemoCheckout._id("MSG", requestId);

    $.when(DB.get("orders/" + session.uid + "/" + orderId)).done(function (existingOrder) {
      if (existingOrder) { deferred.resolve(existingOrder); return; }
      $.when(DB.get("customers/" + session.uid), DB.get("inventory"), DB.get("categories"))
        .done(function (customer, inventory, categories) {
          try {
            const method = String(request.paymentMethod || "");
            if (["cod", "card_demo", "credit"].indexOf(method) < 0) throw new Error("Choose a payment method.");
            const address = request.shippingAddress || {};
            if (String(address.name || "").trim().length < 2) throw new Error("Enter a valid recipient name.");
            if (!/^[6-9]\d{9}$/.test(String(address.mobile || "").trim())) throw new Error("Enter a valid 10-digit mobile number.");
            if (String(address.address || "").trim().length < 8) throw new Error("Enter a complete delivery address.");
            if (String(address.city || "").trim().length < 2) throw new Error("Enter a city.");
            if (!/^\d{6}$/.test(String(address.postalCode || "").trim())) throw new Error("Enter a valid 6-digit PIN code.");
            if (!customer || customer.active !== true) throw new Error("An active customer profile is required to place an order.");
            if (!Array.isArray(request.items) || !request.items.length || request.items.length > 30) throw new Error("Your cart must contain between 1 and 30 products.");

            const seen = {};
            const orderItems = request.items.map(function (line) {
              const productId = String(line && line.productId || "");
              const quantity = Number(line && line.quantity);
              if (!/^[A-Za-z0-9_-]{2,30}$/.test(productId) || seen[productId]) throw new Error("The cart contains an invalid or duplicate product.");
              if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) throw new Error("Product quantities must be whole numbers between 1 and 50.");
              seen[productId] = true;
              const product = inventory && inventory[productId];
              if (!product || product.active !== true) throw new Error("A product in your cart is no longer available.");
              if (!Number.isSafeInteger(product.quantity) || product.quantity < quantity) throw new Error("There is not enough stock for " + product.title + ".");
              if (!Number.isSafeInteger(product.price) || product.price < 1) throw new Error("A product price is invalid.");
              const category = categories && categories[product.catId];
              if (!category || category.active !== true) throw new Error(product.title + " is in an unavailable category.");
              return {
                productId: productId,
                productName: product.title,
                catId: product.catId,
                imageUrl: product.imageUrl || "",
                quantity: quantity,
                unitPrice: product.price,
                subtotal: product.price * quantity
              };
            });
            const totalQuantity = orderItems.reduce(function (sum, line) { return sum + line.quantity; }, 0);
            const totalAmount = orderItems.reduce(function (sum, line) { return sum + line.subtotal; }, 0);
            if (!Number.isSafeInteger(totalAmount) || totalAmount < 1) throw new Error("The order total is invalid.");
            const availableCredit = (Number(customer.creditLimit) || 0) - (Number(customer.creditUsed) || 0);
            if (method === "credit" && totalAmount > availableCredit) {
              throw new Error("This order is above your available store credit of ₹" + Math.max(0, availableCredit) + ".");
            }

            const now = Date.now(), paymentType = method === "credit" ? "credit" : method === "card_demo" ? "card" : "cash";
            const paymentStatus = method === "credit" ? "on-credit" : method === "card_demo" ? "paid" : "pending";
            const order = {
              orderId: orderId,
              billNumber: "BILL-" + new Date(now).toISOString().slice(0, 10).replace(/-/g, "") + "-" + orderId.slice(-6).toUpperCase(),
              customerId: session.uid,
              customerName: customer.name || String(address.name).trim(),
              customerEmail: customer.email || session.email || "",
              customerMobile: String(address.mobile).trim(),
              shippingAddress: {
                name: String(address.name).trim(),
                mobile: String(address.mobile).trim(),
                address: String(address.address).trim(),
                city: String(address.city).trim(),
                postalCode: String(address.postalCode).trim()
              },
              items: orderItems,
              totalQuantity: totalQuantity,
              totalAmount: totalAmount,
              paymentType: paymentType,
              paymentMethod: method,
              paymentStatus: paymentStatus,
              paymentId: paymentId,
              demoPayment: true,
              demoOnly: true,
              stockReserved: false,
              creditCharged: false,
              status: "pending",
              date: now,
              createdAt: now,
              updatedAt: now
            };
            const payment = {
              paymentId: paymentId,
              orderId: orderId,
              customerId: session.uid,
              customerName: order.customerName,
              amount: totalAmount,
              method: method,
              paymentType: paymentType,
              status: paymentStatus,
              kind: "order",
              demo: true,
              createdAt: now,
              updatedAt: now
            };
            const notification = {
              id: notificationId,
              type: "new-order",
              orderId: orderId,
              customerId: session.uid,
              customerName: order.customerName,
              paymentMethod: method,
              amount: totalAmount,
              message: "New " + method + " order from " + order.customerName + " for ₹" + totalAmount + ".",
              read: false,
              createdAt: now
            };
            DB.createMany([
              { path: "orders/" + orderId, data: order },
              { path: "payments/" + paymentId, data: payment },
              { path: "adminNotifications/" + notificationId, data: notification }
            ]).done(function () {
              deferred.resolve(order);
            }).fail(function (error) {
              DB.get("orders/" + session.uid + "/" + orderId).done(function (savedOrder) {
                if (savedOrder) deferred.resolve(savedOrder);
                else deferred.reject(error);
              }).fail(function () { deferred.reject(error); });
            });
          } catch (error) {
            deferred.reject(DemoCheckout._error(error.message));
          }
        })
        .fail(function (error) { deferred.reject(error); });
    }).fail(function (error) { deferred.reject(error); });
    return deferred.promise();
  },

  markCodPaid: function (order) {
    if (!Session.isAdmin()) return $.Deferred().reject(DemoCheckout._error("Only an admin can record a COD payment.")).promise();
    if (!order || order.paymentType !== "cash" || order.paymentStatus !== "pending" || order.status === "cancelled") {
      return $.Deferred().reject(DemoCheckout._error("Only an unpaid, active COD order can be marked paid.")).promise();
    }
    const now = Date.now(), updates = {};
    updates["orders/" + order.customerId + "/" + order.orderId + "/paymentStatus"] = "paid";
    updates["orders/" + order.customerId + "/" + order.orderId + "/updatedAt"] = now;
    if (order.paymentId) {
      updates["payments/" + order.paymentId + "/status"] = "paid";
      updates["payments/" + order.paymentId + "/updatedAt"] = now;
    }
    return DB.multiUpdate(updates);
  },

  cancelOrder: function (order) {
    if (!Session.isAdmin()) return $.Deferred().reject(DemoCheckout._error("Only an admin can cancel an order.")).promise();
    if (!order || ["pending", "confirmed"].indexOf(order.status) < 0) {
      return $.Deferred().reject(DemoCheckout._error("Only pending or confirmed orders can be cancelled.")).promise();
    }
    let paymentStatus = order.paymentStatus;
    if (order.paymentType === "credit" || order.paymentType === "card") paymentStatus = "reversed";
    else if (paymentStatus === "paid") paymentStatus = "refund-required";
    else if (paymentStatus === "pending") paymentStatus = "cancelled";
    const now = Date.now(), updates = {};
    updates["orders/" + order.customerId + "/" + order.orderId + "/status"] = "cancelled";
    updates["orders/" + order.customerId + "/" + order.orderId + "/paymentStatus"] = paymentStatus;
    updates["orders/" + order.customerId + "/" + order.orderId + "/updatedAt"] = now;
    if (order.paymentId) {
      updates["payments/" + order.paymentId + "/status"] = paymentStatus;
      updates["payments/" + order.paymentId + "/updatedAt"] = now;
    }
    return DB.multiUpdate(updates);
  },

  updateStatus: function (order, status) {
    if (!Session.isAdmin()) return $.Deferred().reject(DemoCheckout._error("Only an admin can update order status.")).promise();
    if (!order || nextStatus[order.status].indexOf(status) < 0) {
      return $.Deferred().reject(DemoCheckout._error("That order status change is not allowed.")).promise();
    }
    return DB.multiUpdate({
      ["orders/" + order.customerId + "/" + order.orderId + "/status"]: status,
      ["orders/" + order.customerId + "/" + order.orderId + "/updatedAt"]: Date.now()
    });
  },

  recordCreditPayment: function (customerId, amount) {
    const deferred = $.Deferred();
    if (!Session.isAdmin()) {
      deferred.reject(DemoCheckout._error("Only an admin can record a credit payment."));
      return deferred.promise();
    }
    $.when(DB.get("customers/" + customerId)).done(function (customer) {
      const value = Number(amount);
      if (!customer) { deferred.reject(DemoCheckout._error("Customer not found.")); return; }
      if (!Number.isSafeInteger(value) || value < 1 || value > customer.creditUsed) {
        deferred.reject(DemoCheckout._error("Payment must be a whole amount no greater than the customer's credit used."));
        return;
      }
      const now = Date.now(), paymentId = DemoCheckout._id("PAY", now.toString(36) + Math.random().toString(36).slice(2, 8));
      const notificationId = DemoCheckout._id("MSG", now.toString(36) + Math.random().toString(36).slice(2, 8));
      const payment = {
        paymentId: paymentId,
        customerId: customerId,
        customerName: customer.name || "",
        amount: value,
        method: "credit_repayment",
        paymentType: "credit",
        status: "paid",
        kind: "credit-repayment",
        demo: true,
        createdAt: now,
        updatedAt: now
      };
      const notification = {
        id: notificationId,
        type: "credit-payment",
        customerId: customerId,
        customerName: customer.name || "",
        amount: value,
        message: "Credit payment of ₹" + value + " recorded for " + (customer.name || "a customer") + ".",
        read: false,
        createdAt: now
      };
      const updates = {};
      updates["customers/" + customerId + "/creditUsed"] = customer.creditUsed - value;
      updates["customers/" + customerId + "/updatedAt"] = now;
      DB.writeBatch(updates, [
        { path: "payments/" + paymentId, data: payment },
        { path: "adminNotifications/" + notificationId, data: notification }
      ]).done(function () {
        deferred.resolve({ customerId: customerId, creditUsed: customer.creditUsed - value, paymentId: paymentId });
      }).fail(function (error) { deferred.reject(error); });
    }).fail(function (error) { deferred.reject(error); });
    return deferred.promise();
  },

  markNotificationRead: function (notificationId) {
    if (!Session.isAdmin()) return $.Deferred().reject(DemoCheckout._error("Only an admin can update admin messages.")).promise();
    return DB.patch("adminNotifications/" + notificationId, { read: true });
  }
};
