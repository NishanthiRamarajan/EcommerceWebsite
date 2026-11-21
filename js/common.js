function toast(m, err) { const t = $('<div class="toast"></div>').text(m).toggleClass("err", !!err).appendTo("body"); setTimeout(() => t.remove(), 3000); }
function logout() { localStorage.removeItem("session"); location.href = ROOT + "login.html"; }
function guard(role) { // UX only. Real protection = database.rules.json
  const s = S(); if (!s) return (location.href = ROOT + "login.html");
  const adm = s.email === ADMIN_EMAIL;
  if ((role === "admin" && !adm) || (role === "customer" && adm)) location.href = ROOT + "login.html";
}
const slice = (a, p, s) => a.slice((p - 1) * s, p * s); // page 2, size 5 -> items 5..9
function pager(sel, total, page, size, go) {
  const n = Math.max(1, Math.ceil(total / size));
  let h = `<button data-p="1">« First</button><button data-p="${Math.max(1, page - 1)}">‹ Prev</button>`;
  for (let i = 1; i <= n; i++) h += `<button data-p="${i}" class="${i == page ? "on" : ""}">${i}</button>`;
  h += `<button data-p="${Math.min(n, page + 1)}">Next ›</button><button data-p="${n}">Last »</button>`;
  $(sel).html(h).off("click").on("click", "button", function () { go(+$(this).data("p")); });
}
const V = { email: e => /^\S+@\S+\.\S+$/.test(e), mobile: m => /^[6-9]\d{9}$/.test(m),
  pass: p => p.length >= 8 && /\d/.test(p) && /[a-zA-Z]/.test(p) };
const rs = n => "₹" + Number(n).toLocaleString("en-IN");
