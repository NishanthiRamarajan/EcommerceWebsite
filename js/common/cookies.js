/* cookies.js - Cookies for LIGHTWEIGHT data only: recently viewed products, favourites mirror, preferences.
   Never store passwords or tokens in cookies. Cookies are sent to the server with requests and hold ~4 KB;
   LocalStorage (cart, login session) stays in the browser and holds ~5 MB. */
const Cookies = {
  set: function (name, value, days) {
    const d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax";
  },
  get: function (name) {
    const parts = document.cookie.split("; ");
    for (let i = 0; i < parts.length; i++) {
      const kv = parts[i].split("=");
      if (kv[0] === name) return decodeURIComponent(kv.slice(1).join("="));
    }
    return null;
  },
  remove: function (name) { document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; },
  getJSON: function (name, fallback) { try { const v = Cookies.get(name); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
};

// Preferences per account (guests share "guest"). Example: Prefs.set("pp", 20)
const Prefs = {
  key: function () { const s = Session.get(); return "pref_" + (s ? s.uid : "guest"); },
  get: function (k, def) { const v = Cookies.getJSON(Prefs.key(), {})[k]; return v === undefined ? def : v; },
  set: function (k, v) { const a = Cookies.getJSON(Prefs.key(), {}); a[k] = v; Cookies.set(Prefs.key(), JSON.stringify(a), 365); }
};

// Recently viewed product IDs (newest first, max 8)
const Recent = {
  key: function () { const s = Session.get(); return "rv_" + (s ? s.uid : "guest"); },
  list: function () { return Cookies.getJSON(Recent.key(), []); },
  add: function (id) {
    const l = Recent.list().filter(function (x) { return x !== id; });
    l.unshift(id);
    Cookies.set(Recent.key(), JSON.stringify(l.slice(0, 8)), 30);
  }
};
