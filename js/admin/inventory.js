/* inventory.js - Inventory CRUD, catalog imports, image URLs/uploads, and pagination. */
$(function () {
  if (!$("#invRows").length || !Session.isAdmin()) return;
  $("h1").after('<p class="hint">Browser-local stock is separate from the Firestore quantity shown in the edit form.</p>');
  $("label[for='pQty']").text("Firestore quantity (0 = out of stock)");
  $("#pQty").closest(".field").append('<p class="hint">This edits the Firestore product quantity. Browser-local stock remains separate.</p>');
  $("#invRows").closest("table").find("thead th").eq(4).text("Browser-local / Firestore stock");
  let products = [], cats = [], catMap = {}, editing = null;
  const accessories = [
    { id: "ACC-A1", title: "Red Leather Card Holder", description: "Compact red card holder with decorative front design.", price: 1999, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248438/A1.png" },
    { id: "ACC-A2", title: "Black Monogram Card Holder", description: "Black patterned card holder with front flap.", price: 2499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248437/A2.png" },
    { id: "ACC-A3", title: "Grey Monogram Wallet", description: "Grey patterned wallet with decorative gold-tone detail.", price: 3999, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248433/A3.png" },
    { id: "ACC-A4", title: "Beige Leather Belt", description: "Beige belt with elegant gold-tone buckle.", price: 4999, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248431/A4.png" },
    { id: "ACC-A5", title: "Crystal Star Keychain", description: "Star-shaped decorative keychain with crystal detailing.", price: 999, quantity: 20, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248426/A5.png" },
    { id: "ACC-A6", title: "Plush Bunny Keychain", description: "Soft white bunny plush keychain with gold-tone attachment.", price: 799, quantity: 20, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248424/A6.png" },
    { id: "ACC-A7", title: "Gold Frame Sunglasses", description: "Gold-tone frame sunglasses with gradient lenses.", price: 2999, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248422/A7.png" },
    { id: "ACC-A8", title: "Black Knitted Bucket Hat", description: "Black knitted bucket hat with embroidered front detail.", price: 2499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248419/A8.png" },
    { id: "ACC-A9", title: "Navy Blue Baseball Cap", description: "Navy blue cap with embroidered front design.", price: 1999, quantity: 12, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248417/A9.png" },
    { id: "ACC-A10", title: "Pink Satin Bow Hair Accessory", description: "Pink satin bow with decorative gold-tone centre.", price: 999, quantity: 15, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248414/A10.png" },
    { id: "ACC-A11", title: "Black Quilted Hair Claw Clip", description: "Black claw clip with quilted pattern.", price: 799, quantity: 15, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248413/A11.png" },
    { id: "ACC-A12", title: "Brown Plush Earmuffs", description: "Soft brown faux-fur earmuffs.", price: 1499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248412/A12.png" }
  ];
  const kidsClothing = [
    { id: "KID-KIDS1", title: "White Collared Shirt", description: "Classic white long-sleeve collared shirt for kids.", price: 1499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248515/kids1.png" },
    { id: "KID-KIDS2", title: "Blue Denim Wide-Leg Jeans", description: "Blue denim jeans with a relaxed wide-leg fit and folded hems.", price: 1799, quantity: 12, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248510/kids2.png" },
    { id: "KID-KIDS3", title: "Beige Wide-Leg Trousers", description: "Beige pleated wide-leg trousers for a smart casual look.", price: 1499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248508/kids3.png" },
    { id: "KID-KIDS4", title: "Black Straight-Fit Trousers", description: "Classic black straight-fit trousers for kids.", price: 1599, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248504/kids4.png" },
    { id: "KID-KIDS5", title: "Black & White Textured Dress", description: "Short-sleeve textured dress with contrasting black trim.", price: 2499, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248502/kids5.png" },
    { id: "KID-KIDS6", title: "Black & White Textured Skirt", description: "Flared textured skirt with a contrasting black hem.", price: 1499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248498/kids6.png" },
    { id: "KID-KIDS7", title: "Navy Blue Varsity Jacket", description: "Navy blue and white varsity-style jacket with button closure.", price: 2999, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248496/kids7.png" },
    { id: "KID-KIDS8", title: "White Layered Tulle Skirt", description: "Elegant white layered tulle skirt with an elastic waistband.", price: 1799, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248493/kids8.png" },
    { id: "KID-KIDS9", title: "Red Hooded Knit Cardigan", description: "Red knitted hooded cardigan with front button closure.", price: 2499, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795248491/kids9.png" }
  ];
  const womensClothing = [
    { id: "CLOTH-IMAGE1", title: "Maroon Embroidered Lehenga Choli", description: "Maroon net lehenga with floral embroidery, pearl detailing and matching sleeveless blouse.", price: 5999, quantity: 5, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263836/Stunning_Maroon_Net_Lehenga_Choli_with_Floral_Embroidery_Pearl_Work.jpg" },
    { id: "CLOTH-IMAGE2", title: "White Sunflower Maxi Dress", description: "White long-sleeve maxi dress with sunflower prints.", price: 2499, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263830/b65b29a6-8a52-47fc-a9fc-01c5c5238a17.jpg" },
    { id: "CLOTH-IMAGE3", title: "Cream Floral Embroidered Shirt", description: "Cream button-down shirt with delicate floral embroidery.", price: 1799, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263825/b717f582-bd2c-4c74-bcbb-2769c1e1d061.jpg" },
    { id: "CLOTH-IMAGE4", title: "Brown Waffle-Knit Henley Shirt", description: "Brown textured waffle-knit long-sleeve Henley shirt.", price: 1499, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263819/3da495ea-a24f-41eb-8330-fdc9b104a5e3.jpg" },
    { id: "CLOTH-IMAGE5", title: "Olive Green Casual Overshirt", description: "Olive green button-down overshirt with front pockets.", price: 1999, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263808/e43431ec-22a0-43b4-898c-c507f3577c01.jpg" },
    { id: "CLOTH-IMAGE6", title: "Vintage Graphic Oversized T-Shirt", description: "Dark brown oversized graphic T-shirt with vintage-inspired artwork.", price: 1299, quantity: 15, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263802/Premium_Oversized_Graphic_T-Shirts_for_Men___Vintage_Streetwear_Aesthetic_Casual_Tees.jpg" },
    { id: "CLOTH-IMAGE7", title: "Dark Brown Casual Button-Down Shirt", description: "Dark brown full-sleeve casual shirt with chest pocket.", price: 1799, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263796/394878c7-0d21-4661-9720-87dd8eb12835.jpg" },
    { id: "CLOTH-IMAGE8", title: "Beige Faux Fur Collar Coat", description: "Elegant beige coat with faux fur collar and sleeve cuffs.", price: 5499, quantity: 5, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263790/Damen_Gro%C3%9Fe_Gr%C3%B6%C3%9Fen_Mantel_mit_Kunstpelzkragen_Patchwork_Taille_aus_Wolle.jpg" },
    { id: "CLOTH-IMAGE9", title: "Navy Blue Embroidered Saree", description: "Navy blue saree with intricate silver embroidery and embellished border.", price: 6999, quantity: 5, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263786/dd1f5e60-6163-43f6-90f5-694be9006ea2.jpg" },
    { id: "CLOTH-IMAGE10", title: "Grey Ombre Knit Sweater", description: "Grey-to-white gradient sweater with textured detailing.", price: 2499, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263781/d185f1d6-afc9-4a89-b8aa-5d0d0642858c.jpg" },
    { id: "CLOTH-IMAGE11", title: "Beige Casual Button-Down Shirt", description: "Beige long-sleeve button-down shirt with chest pocket.", price: 1699, quantity: 10, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263777/7b0a1877-c255-41b4-8c85-76318d82d170.jpg" },
    { id: "CLOTH-IMAGE12", title: "Black Toggle-Closure Jacket", description: "Black jacket with front zipper and decorative toggle closures.", price: 3499, quantity: 6, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263772/ccfdee9b-54f8-412d-96ba-dcc125de0c2e.jpg" },
    { id: "CLOTH-IMAGE13", title: "Champagne A-Line Midi Dress", description: "Champagne short-sleeve A-line dress with collared neckline and waist belt.", price: 3499, quantity: 6, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263768/Wedtrend_Champagne_Dress_for_Women_50_s_Style_Cocktail_Dress_Vintage_A-line_Bridesmaid_Dresses_Ladies_Audrey_Hepburn_Style_Casual_Dresses_50s_Pinup_Dresses_Themed_Party_Dress_WTP30001ChampagneM_at.jpg" },
    { id: "CLOTH-IMAGE14", title: "Tan Faux Shearling Jacket", description: "Tan jacket with cream faux shearling lining and trim.", price: 4999, quantity: 5, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263763/Women_s_Jackets_Coats___TOTEME_Outerwear.jpg" },
    { id: "CLOTH-IMAGE15", title: "Maroon High-Neck Chiffon Blouse", description: "Maroon high-neck blouse with gathered neckline and sheer chiffon sleeves.", price: 1999, quantity: 8, imageUrl: "https://res.cloudinary.com/e6m1pe7r/image/upload/v1795263759/cadc5377-7ed8-4f91-9010-9c1744a33fdf.jpg" }
  ];
  const pg = new Paginator({ container: "#pager", perPage: Prefs.get("pp", 10), onSize: function (n) { Prefs.set("pp", n); },
    onPage: function (items) {
      $("#invRows").html(items.length ? items.map(function (p) {
        const id = Utils.esc(p.id);
        return "<tr><td>" + id + '</td><td><img class="thumb" src="' + Utils.img(p) + '" alt=""></td><td>' + Utils.esc(p.title) + (p.featured ? ' <span class="badge st-confirmed">Featured</span>' : "") + "</td><td>" + Utils.esc(catMap[p.catId] ? catMap[p.catId].name : p.catId) +
          '</td><td class="num">Local: ' + p.demoQuantity + " " + Utils.stockBadge(p.demoQuantity, true) + '<br><small class="muted">Firestore: ' + p.quantity + "</small></td><td class=\"num\">" + Utils.money(p.price) + "</td><td>" + (p.active ? '<span class="badge st-delivered">Active</span>' : '<span class="badge st-cancelled">Inactive</span>') +
          '</td><td class="acts"><button class="btn btn-sm btn-ghost" data-act="view" data-id="' + id + '">View</button><button class="btn btn-sm" data-act="edit" data-id="' + id + '">Edit</button><button class="btn btn-sm btn-ghost" data-act="toggle" data-id="' + id + '">' + (p.active ? "Deactivate" : "Activate") +
          '</button><button class="btn btn-sm btn-danger" data-act="del" data-id="' + id + '">Delete</button></td></tr>';
      }).join("") : '<tr><td colspan="8" class="muted">No products found.</td></tr>');
    } });
  function find(id) { return products.filter(function (p) { return p.id === id; })[0]; }

  function filter() {
    const cat = $("#fCat").val(), type = $("#fType").val(), q = $.trim($("#fQ").val()).toLowerCase();
    pg.setItems(products.filter(function (p) {
      if (cat && p.catId !== cat) return false;
      if (!q) return true;
      if (type === "id") return p.id.toLowerCase().indexOf(q) > -1;
      if (type === "name") return p.title.toLowerCase().indexOf(q) > -1;
      return p.id.toLowerCase().indexOf(q) > -1 || p.title.toLowerCase().indexOf(q) > -1;
    }));
  }
  function load(keep) {
    $.when(DB.get("inventory"), DB.get("categories")).done(function (inv, ca) {
      try {
        products = Utils.list(inv).map(function (product) {
          return $.extend({}, product, { demoQuantity: DemoStore.stockFor(product.id, product.quantity) });
        }).sort(function (a, b) { return a.id.localeCompare(b.id); });
        cats = Utils.list(ca).sort(function (a, b) { return a.name.localeCompare(b.name); }); catMap = {}; cats.forEach(function (c) { catMap[c.id] = c; });
        const opts = cats.map(function (c) { return '<option value="' + Utils.esc(c.id) + '">' + Utils.esc(c.name) + "</option>"; }).join("");
        const cur = $("#fCat").val(); $("#fCat").html('<option value="">All categories</option>' + opts).val(cur || ""); $("#pCat").html('<option value="">Choose...</option>' + opts);
        if (keep) pg.setItems(products, true); else filter();
      } catch (error) {
        Utils.toast(error.message, "error");
      }
    }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
  }
  $("#fCat, #fType").on("change", filter); $("#fQ").on("input", Utils.debounce(filter, 250));

  function openForm(p) {
    clearPreviewUrl();
    editing = p || null; $("#prodForm")[0].reset(); Utils.showFieldErrors({}, "#prodForm"); $("#prodTitle").text(p ? "Edit product" : "Add product");
    $("#pId").prop("readonly", !!p);
    if (p) { $("#pId").val(p.id); $("#pCat").val(p.catId); $("#pTitle").val(p.title); $("#pDesc").val(p.description || ""); $("#pQty").val(p.quantity); $("#pPrice").val(p.price); $("#pUrl").val(p.imageUrl || ""); $("#pFeat").prop("checked", !!p.featured); }
    $("#pPrev").attr("src", p ? (p.imageUrl || Utils.placeholder(p.title)) : Utils.placeholder("?"));
    Utils.openModal("prodModal");
  }
  $("#addProd").on("click", function () { if (!cats.length) { Utils.toast("Create a category first.", "error"); return; } openForm(null); });
  function importCatalog(categoryName, requestedCategoryId, items, buttonLabel, $button) {
    Utils.confirm("Add the " + categoryName + " category and " + items.length + " products? Existing products with matching IDs will not be overwritten.").then(function (yes) {
      if (!yes) return;
      Utils.setLoading($button, true, "Importing...");
      function finish() { Utils.setLoading($button, false, buttonLabel); }

      $.when(DB.get("categories"), DB.get("inventory")).done(function (categoryData, inventoryData) {
        const categories = Object.keys(categoryData || {}).map(function (id) { return categoryData[id]; });
        const matchingCategories = categories.filter(function (category) {
          return String(category.name || "").toLowerCase() === categoryName.toLowerCase();
        });
        if (matchingCategories.length > 1) {
          Utils.toast("More than one " + categoryName + " category exists. Resolve the duplicate categories first.", "error");
          finish();
          return;
        }
        const category = matchingCategories[0] || (categoryData && categoryData[requestedCategoryId]);
        if (category && String(category.name || "").toLowerCase() !== categoryName.toLowerCase()) {
          Utils.toast("Category ID " + requestedCategoryId + " is already used by another category.", "error");
          finish();
          return;
        }
        const categoryId = category ? category.id : requestedCategoryId;

        const existingProducts = inventoryData || {};
        const conflicts = items.filter(function (item) {
          const existing = existingProducts[item.id];
          return existing && existing.catId !== categoryId;
        });
        if (conflicts.length) {
          Utils.toast("Import stopped: product ID conflict for " + conflicts.map(function (item) { return item.id; }).join(", ") + ".", "error");
          finish();
          return;
        }

        const now = Date.now(), updates = {};
        if (!category) {
          updates["categories/" + categoryId] = { id: categoryId, name: categoryName, active: true, createdAt: now, updatedAt: now };
        } else if (!category.active) {
          updates["categories/" + categoryId + "/active"] = true;
          updates["categories/" + categoryId + "/updatedAt"] = now;
        }
        let skipped = 0;
        items.forEach(function (item) {
          if (existingProducts[item.id]) { skipped += 1; return; }
          updates["inventory/" + item.id] = {
            id: item.id,
            catId: categoryId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
            storagePath: "",
            featured: false,
            active: true,
            soldCount: 0,
            createdAt: now,
            updatedAt: now
          };
        });
        if (!Object.keys(updates).length) {
          Utils.toast(categoryName + " catalog is already imported.", "info");
          finish();
          return;
        }
        DB.multiUpdate(updates).done(function () {
          const imported = items.length - skipped;
          Utils.toast(imported + " " + categoryName + " product" + (imported === 1 ? "" : "s") + " added" + (skipped ? "; " + skipped + " existing product" + (skipped === 1 ? " was" : "s were") + " left unchanged." : "."), "success");
          load(true);
        }).fail(function (error) {
          Utils.toast(AuthAPI.friendlyError(error), "error");
        }).always(finish);
      }).fail(function (error) {
        Utils.toast(AuthAPI.friendlyError(error), "error");
        finish();
      });
    });
  }
  $("#seedAccessories").on("click", function () {
    importCatalog("Accessories", "ACCESSORIES", accessories, "Import Accessories (12)", $(this));
  });
  const $seedKidsClothing = $('<button class="btn btn-ghost" id="seedKidsClothing" type="button">Import Kids Clothing (9)</button>');
  $seedKidsClothing.insertAfter("#seedAccessories").on("click", function () {
    importCatalog("Clothing", "CLOTHING", kidsClothing, "Import Kids Clothing (9)", $(this));
  });
  const $seedWomensClothing = $('<button class="btn btn-ghost" id="seedWomensClothing" type="button">Import Women\'s Clothing (15)</button>');
  $seedWomensClothing.insertAfter("#seedKidsClothing").on("click", function () {
    importCatalog("Clothing", "CLOTHING", womensClothing, "Import Women's Clothing (15)", $(this));
  });
  let previewUrl = "";
  function clearPreviewUrl() { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ""; }
  $("#pUrl").on("input", function () { const v = $.trim($(this).val()); if (/^https?:\/\//i.test(v)) $("#pPrev").attr("src", v); });
  $("#pFile").on("change", function () {
    const f = this.files[0];
    clearPreviewUrl();
    if (f) { previewUrl = URL.createObjectURL(f); $("#pPrev").attr("src", previewUrl); }
  });

  $("#invRows").on("click", "[data-act]", function () {
    const p = find($(this).attr("data-id")), act = $(this).attr("data-act");
    if (act === "edit") openForm(p);
    if (act === "view") {
      $("#viewBody").html('<div style="display:flex;gap:16px;flex-wrap:wrap"><img class="preview" style="width:200px;height:150px" src="' + Utils.img(p) + '" alt=""><dl class="kv" style="flex:1"><dt>ID</dt><dd>' + Utils.esc(p.id) + "</dd><dt>Title</dt><dd>" + Utils.esc(p.title) + "</dd><dt>Category</dt><dd>" + Utils.esc(catMap[p.catId] ? catMap[p.catId].name : p.catId) +
        "</dd><dt>Description</dt><dd>" + Utils.esc(p.description || "-") + "</dd><dt>Browser-local stock</dt><dd>" + p.demoQuantity + " " + Utils.stockBadge(p.demoQuantity, true) + "</dd><dt>Firestore quantity</dt><dd>" + p.quantity + "</dd><dt>Price</dt><dd>" + Utils.money(p.price) + "</dd><dt>Sold so far</dt><dd>" + (p.soldCount || 0) + "</dd><dt>Status</dt><dd>" + (p.active ? "Active" : "Inactive") +
        "</dd><dt>Created</dt><dd>" + Utils.dateTime(p.createdAt) + "</dd><dt>Updated</dt><dd>" + Utils.dateTime(p.updatedAt) + "</dd></dl></div>");
      Utils.openModal("viewModal");
    }
    if (act === "toggle") DB.patch("inventory/" + p.id, { active: !p.active, updatedAt: Date.now() }).done(function () { Utils.toast(p.active ? "Product deactivated" : "Product activated", "success"); load(true); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
    if (act === "del") Utils.confirm("Are you sure you want to permanently delete \"" + p.title + "\"? Past orders keep their own copy of the name and price.").then(function (yes) {
      if (!yes) return;
      DB.remove("inventory/" + p.id).done(function () { if (p.storagePath) StorageAPI.remove(p.storagePath); Utils.toast("Product deleted", "success"); load(true); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); });
    });
  });

  // Uploaded file takes precedence over a pasted URL; legacy Firebase Storage images remain supported.
  function resolveImage(cur) {
    const file = $("#pFile")[0].files[0], url = $.trim($("#pUrl").val());
    if (file) {
      return CloudinaryAPI.upload(file).then(function (result) {
        return { imageUrl: result.imageUrl, storagePath: "", removeStoragePath: cur.storagePath || "" };
      });
    }
    const changed = url !== (cur.imageUrl || "");
    return $.Deferred().resolve({
      imageUrl: url,
      storagePath: changed ? "" : (cur.storagePath || ""),
      removeStoragePath: changed ? (cur.storagePath || "") : ""
    }).promise();
  }

  $("#prodForm").on("submit", function (e) {
    e.preventDefault();
    const d = { id: $.trim($("#pId").val()), catId: $("#pCat").val(), title: $.trim($("#pTitle").val()), description: $.trim($("#pDesc").val()), quantity: $.trim($("#pQty").val()), price: $.trim($("#pPrice").val()), imageUrl: $.trim($("#pUrl").val()) };
    const errors = Validate.product(d, { isEdit: !!editing, existingIds: products.map(function (p) { return p.id; }), categoryIds: cats.map(function (c) { return c.id; }) });
    const file = $("#pFile")[0].files[0];
    if (file && !/^image\//.test(file.type)) errors.imageFile = "Choose an image file.";
    else if (file && file.size > 2 * 1024 * 1024) errors.imageFile = "Image must be 2 MB or smaller.";
    Utils.showFieldErrors(errors, "#prodForm");
    if (!$.isEmptyObject(errors)) return;
    const $b = $("#saveProd"); Utils.setLoading($b, true, "Saving...");
    const now = Date.now(), cur = editing || {};
    let resolvedImage;
    resolveImage(cur).then(function (img) {
      resolvedImage = img;
      const base = { catId: d.catId, title: d.title, description: d.description, quantity: parseInt(d.quantity, 10), price: parseInt(d.price, 10), imageUrl: img.imageUrl, storagePath: img.storagePath, featured: $("#pFeat").is(":checked"), updatedAt: now };
      if (editing) return DB.patch("inventory/" + d.id, base);
      return DB.put("inventory/" + d.id, $.extend({ id: d.id, active: true, soldCount: 0, createdAt: now }, base));
    }).done(function () {
      Utils.closeModal("prodModal");
      $("#pFile").val("");
      clearPreviewUrl();
      if (resolvedImage.removeStoragePath) {
        StorageAPI.remove(resolvedImage.removeStoragePath).fail(function (error) {
          Utils.toast("Product saved, but the previous Firebase image could not be removed: " + AuthAPI.friendlyError(error), "error");
        });
      }
      Utils.toast("Product saved", "success");
      load(true);
    })
      .fail(function (x) {
        const cloudinaryMessage = x && x.responseJSON && x.responseJSON.error && x.responseJSON.error.message;
        Utils.toast(cloudinaryMessage || (x instanceof Error ? x.message : AuthAPI.friendlyError(x)), "error");
      })
      .always(function () { Utils.setLoading($b, false, "Save product"); });
  });
  load();
});
