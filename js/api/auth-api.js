/* auth-api.js - Firebase Authentication REST API. Every method returns a jQuery promise resolved with the JSON body. */
const AuthAPI = {
  _post: function (endpoint, body) {
    const d = $.Deferred();
    $.ajax({
      url: AUTH_BASE + "/" + endpoint + "?key=" + FIREBASE_CONFIG.apiKey,
      method: "POST", contentType: "application/json", data: JSON.stringify(body), dataType: "json"
    }).done(function (data) { d.resolve(data); }).fail(function (xhr) { d.reject(xhr); });
    return d.promise();
  },
  register: function (email, password) { return AuthAPI._post("accounts:signUp", { email: email, password: password, returnSecureToken: true }); },
  login: function (email, password) { return AuthAPI._post("accounts:signInWithPassword", { email: email, password: password, returnSecureToken: true }); },
  sendVerificationEmail: function (idToken) { return AuthAPI._post("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: idToken }); },
  sendPasswordReset: function (email) { return AuthAPI._post("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email: email }); },
  lookup: function (idToken) { return AuthAPI._post("accounts:lookup", { idToken: idToken }); },   // users[0].emailVerified

  refresh: function (refreshToken) {
    const d = $.Deferred();
    $.ajax({
      url: TOKEN_URL + "?key=" + FIREBASE_CONFIG.apiKey, method: "POST",
      contentType: "application/x-www-form-urlencoded",
      data: { grant_type: "refresh_token", refresh_token: refreshToken }, dataType: "json"
    }).done(function (data) { d.resolve(data); }).fail(function (xhr) { d.reject(xhr); });
    return d.promise();
  },

  // Returns a valid ID token; refreshes it automatically when it is about to expire (ID tokens last 1 hour).
  getValidToken: function () {
    const d = $.Deferred(), s = Session.get();
    if (!s) { d.reject("NOT_LOGGED_IN"); return d.promise(); }
    if (!Session.isExpired()) { d.resolve(s.idToken); return d.promise(); }
    AuthAPI.refresh(s.refreshToken)
      .done(function (res) { d.resolve(Session.save(res).idToken); })
      .fail(function () { Session.clear(); d.reject("SESSION_EXPIRED"); });
    return d.promise();
  },

  // Gets a brand-new token now (needed after the email gets verified, so the token carries email_verified = true).
  forceRefresh: function () {
    const s = Session.get(), d = $.Deferred();
    if (!s) { d.reject("NOT_LOGGED_IN"); return d.promise(); }
    AuthAPI.refresh(s.refreshToken).done(function (res) { d.resolve(Session.save(res)); }).fail(function (x) { d.reject(x); });
    return d.promise();
  },

  friendlyError: function (err) {
    if (typeof err === "string") return (err === "SESSION_EXPIRED" || err === "NOT_LOGGED_IN") ? "Please log in again." : err;
    if (err && err.status === 0) return "Network error. Check your internet connection.";
    const body = err && err.responseJSON;
    let code = "";
    if (body && body.error) code = typeof body.error === "string" ? body.error : (body.error.message || "");
    if (code === "Permission denied") return "You do not have permission to do this.";
    const map = {
      EMAIL_EXISTS: "This email is already registered.", INVALID_LOGIN_CREDENTIALS: "Incorrect email or password.",
      EMAIL_NOT_FOUND: "No account found with this email.", INVALID_PASSWORD: "Incorrect email or password.",
      USER_DISABLED: "This account has been disabled.", WEAK_PASSWORD: "Password must be at least 6 characters.",
      INVALID_EMAIL: "Please enter a valid email address.", TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Try again later."
    };
    for (const k in map) { if (code.indexOf(k) === 0) return map[k]; }
    return code || "Something went wrong. Please try again.";
  }
};
