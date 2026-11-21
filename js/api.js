// Central API layer: jQuery AJAX -> Firestore REST + Firebase Auth REST.
// Firestore stores typed values ({stringValue:"x"}); toFs/fromFs convert to/from plain JS objects.
const AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts:";
const FS = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/`;
const S = () => { try { return JSON.parse(localStorage.getItem("session") || "null"); } catch (e) { return null; } };
const fieldsOf = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toFs(v)]));
const toFs = v => v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v }
  : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === "string" ? { stringValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(toFs) } } : { mapValue: { fields: fieldsOf(v) } };
const fromFields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fromFs(v)]));
const fromFs = f => { const k = Object.keys(f)[0], v = f[k];
  return k === "integerValue" ? Number(v) : k === "nullValue" ? null : k === "arrayValue" ? (v.values || []).map(fromFs) : k === "mapValue" ? fromFields(v.fields || {}) : v; };
function req(method, path, body, query) {
  const s = S(), isCol = path.indexOf("/") < 0;
  return $.ajax({ url: FS() + path + (query || ""), method, contentType: "application/json", data: body ? JSON.stringify(body) : undefined,
    headers: s ? { Authorization: "Bearer " + s.idToken } : {},
    dataFilter: t => { if (!t || method === "DELETE") return "{}"; const j = JSON.parse(t);
      if (method === "GET" && isCol) return JSON.stringify(Object.fromEntries((j.documents || []).map(d => [d.name.split("/").pop(), fromFields(d.fields || {})])));
      return JSON.stringify(j.fields ? fromFields(j.fields) : {}); } // collection -> {id:data}; document -> data
  }).fail(x => { if (x.status === 401) { toast("Session expired. Please sign in again.", true); setTimeout(logout, 1200); } });
}
const getData = p => req("GET", p, null, p.indexOf("/") < 0 ? "?pageSize=300" : ""), postData = (p, d) => req("POST", p, { fields: fieldsOf(d) }),
  putData = (p, d) => req("PATCH", p, { fields: fieldsOf(d) }), // replaces whole document (creates if missing)
  patchData = (p, d) => req("PATCH", p, { fields: fieldsOf(d) }, "?" + Object.keys(d).map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&")),
  deleteData = p => req("DELETE", p);
const authCall = (action, body) => $.ajax({ url: AUTH_URL + action + "?key=" + FIREBASE_CONFIG.apiKey, method: "POST", contentType: "application/json", data: JSON.stringify(body) });
const errMsg = x => (x.responseJSON && x.responseJSON.error && (x.responseJSON.error.message || x.responseJSON.error)) || "Network error";
