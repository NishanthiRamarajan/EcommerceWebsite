/* profile.js - edit name and mobile. Email is fixed; credit limit/used are read-only (only the admin changes them). */
$(function () {
  if (!$("#profilePage").length) return;
  if (!Guard.requireLogin("login.html")) return;
  const s = Session.get();

  function load() {
    $.when(DB.get("customers/" + s.uid), AuthAPI.getValidToken().then(AuthAPI.lookup)).done(function (p, info) {
      if (!p) { $("#profileMsg").addClass("error").text("Profile not found."); return; }
      $("#name").val(p.name); $("#email").val(p.email); $("#mobile").val(p.mobile);
      $("#cLimit").text(Utils.money(p.creditLimit)); $("#cUsed").text(Utils.money(p.creditUsed)); $("#cAvail").text(Utils.money(p.creditLimit - p.creditUsed));
      const v = !!(info.users && info.users[0] && info.users[0].emailVerified);
      $("#verState").html(v ? '<span class="badge st-delivered">Email verified</span>' : '<span class="badge st-pending">Email not verified</span> <button type="button" class="btn btn-sm btn-ghost" id="sendVerify">Send verification email</button>');
    }).fail(function (e) { Utils.showMessage("#profileMsg", AuthAPI.friendlyError(e), "error"); });
  }
  $(document).on("click", "#sendVerify", function () { AuthAPI.getValidToken().then(AuthAPI.sendVerificationEmail).done(function () { Utils.toast("Verification email sent.", "success"); }).fail(function (e) { Utils.toast(AuthAPI.friendlyError(e), "error"); }); });

  $("#profileForm").on("submit", function (e) {
    e.preventDefault(); Utils.clearMessage("#profileMsg");
    const d = { name: $.trim($("#name").val()), mobile: $.trim($("#mobile").val()) }, errors = Validate.profile(d);
    Utils.showFieldErrors(errors);
    if (!$.isEmptyObject(errors)) return;
    const $b = $("#saveBtn"); Utils.setLoading($b, true, "Saving...");
    DB.patch("customers/" + s.uid, d).done(function () { Utils.showMessage("#profileMsg", "Profile saved.", "success"); })
      .fail(function (x) { Utils.showMessage("#profileMsg", AuthAPI.friendlyError(x), "error"); }).always(function () { Utils.setLoading($b, false, "Save changes"); });
  });
  load();
});
