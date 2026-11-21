$("[data-f]").on("click", function () { $(".frm").hide(); $("#" + $(this).data("f")).show(); });
function saveSession(r) { localStorage.setItem("session", JSON.stringify({ uid: r.localId, email: r.email, idToken: r.idToken, refreshToken: r.refreshToken })); }
function go(email) { location.href = email === ADMIN_EMAIL ? "admin/inventory.html" : "customer/products.html"; }
$("#fin").on("submit", function (e) {
  e.preventDefault(); $("#i_m").text("");
  const em = $("#i_e").val().trim();
  if (!V.email(em) || !$("#i_p").val()) return $("#i_m").text("Enter a valid email and password.");
  authCall("signInWithPassword", { email: em, password: $("#i_p").val(), returnSecureToken: true }).done(r => {
    saveSession(r);
    if (em === ADMIN_EMAIL) return go(em);
    getData("customers/" + r.localId).done(c => {
      if (!c || c.active === false) { localStorage.removeItem("session"); return $("#i_m").text("Account is inactive or missing."); }
      go(em);
    });
  }).fail(x => $("#i_m").text(errMsg(x)));
});
$("#fup").on("submit", function (e) {
  e.preventDefault(); $(".err-t").text("");
  const n = $("#u_n").val().trim(), em = $("#u_e").val().trim(), m = $("#u_m").val().trim(), p = $("#u_p").val(); let ok = true;
  const bad = (id, t) => { $("#" + id).text(t); ok = false; };
  if (!n) bad("u_n_e", "Name required"); if (!V.email(em)) bad("u_e_e", "Invalid email");
  if (!V.mobile(m)) bad("u_m_e", "Invalid mobile"); if (!V.pass(p)) bad("u_p_e", "Min 8 chars with letters and digits");
  if (p !== $("#u_c").val()) bad("u_c_e", "Passwords do not match"); if (!ok) return;
  authCall("signUp", { email: em, password: p, returnSecureToken: true }).done(r => {
    saveSession(r);
    putData("customers/" + r.localId, { name: n, email: em, mobile: m, creditLimit: 0, creditUsed: 0, active: true, createdDate: new Date().toISOString() })
      .done(() => go(em)).fail(x => toast(errMsg(x), true));
  }).fail(x => toast(errMsg(x), true));
});
$("#frs").on("submit", function (e) {
  e.preventDefault();
  if (!V.email($("#r_e").val().trim())) return toast("Invalid email", true);
  authCall("sendOobCode", { requestType: "PASSWORD_RESET", email: $("#r_e").val().trim() }).done(() => toast("Reset email sent")).fail(x => toast(errMsg(x), true));
});
