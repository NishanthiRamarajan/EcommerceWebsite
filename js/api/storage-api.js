/* storage-api.js - Firebase Storage REST API (product image upload). Needs Storage enabled and docs/storage-rules.txt published. */
const StorageAPI = {
  _base: function () { return "https://firebasestorage.googleapis.com/v0/b/" + FIREBASE_CONFIG.storageBucket + "/o"; },
  downloadUrl: function (path, token) { return StorageAPI._base() + "/" + encodeURIComponent(path) + "?alt=media&token=" + token; },
  // file = File object, path = "products/P1001.jpg". Resolves with { storagePath, imageUrl }.
  upload: function (file, path) {
    const d = $.Deferred();
    AuthAPI.getValidToken().done(function (token) {
      $.ajax({
        url: StorageAPI._base() + "?name=" + encodeURIComponent(path), method: "POST",
        headers: { Authorization: "Firebase " + token },
        contentType: file.type || "application/octet-stream", data: file, processData: false, dataType: "json"
      }).done(function (res) { d.resolve({ storagePath: res.name, imageUrl: StorageAPI.downloadUrl(res.name, res.downloadTokens) }); })
        .fail(function (x) { d.reject(x); });
    }).fail(function (e) { d.reject(e); });
    return d.promise();
  },
  remove: function (path) {
    const d = $.Deferred();
    AuthAPI.getValidToken().done(function (token) {
      $.ajax({ url: StorageAPI._base() + "/" + encodeURIComponent(path), method: "DELETE", headers: { Authorization: "Firebase " + token } })
        .done(function () { d.resolve(); }).fail(function (x) { d.reject(x); });
    }).fail(function (e) { d.reject(e); });
    return d.promise();
  }
};
