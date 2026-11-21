/* session.js - login state kept in LocalStorage so it survives refresh and reopening */
const Session = {
  KEY: "shop_session",
  save: function (res) {
    const old = Session.get();
    const data = {
      uid: res.localId || res.user_id,
      email: res.email || (old && old.email) || "",
      role: res.role || (old && old.uid === (res.localId || res.user_id) ? (old.role || "Customer") : "Customer"),
      idToken: res.idToken || res.id_token,
      refreshToken: res.refreshToken || res.refresh_token,
      expiresAt: Date.now() + parseInt(res.expiresIn || res.expires_in, 10) * 1000
    };
    localStorage.setItem(Session.KEY, JSON.stringify(data));
    return data;
  },
  get: function () { try { return JSON.parse(localStorage.getItem(Session.KEY)); } catch (e) { return null; } },
  clear: function () { localStorage.removeItem(Session.KEY); },
  isLoggedIn: function () { return !!Session.get(); },
  // Only chooses which screens to show. Firebase rules are the real protection.
  isAdmin: function () { const s = Session.get(); return !!s && s.role === "Admin"; },
  isExpired: function () { const s = Session.get(); return !s || Date.now() > s.expiresAt - 60000; }
};
