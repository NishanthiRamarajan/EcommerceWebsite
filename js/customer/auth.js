/* customer/auth.js - registration, login and password reset (each handler runs only if its form exists on the page) */
$(function () {
  let pendingVerificationToken = null;

  function loginMessage(err) {
    const custom = {
      ADMIN_ROLE_SETUP: "This account's Firestore role must be exactly Admin, with isActive set to true.",
      ADMIN_INACTIVE: "This admin account is inactive. Contact the store administrator.",
      PROFILE_MISSING: "This account has no matching Firestore customer profile. Accounts created directly in Authentication also need a customers/{UID} document; migrate/create it or register through the app.",
      ACCOUNT_INACTIVE: "Your account has been deactivated. Please contact the store."
    };
    return custom[err] || AuthAPI.friendlyError(err);
  }

  /* REGISTER: 1) create Firebase account  2) create customer profile  3) send verification email */
  $("#registerForm").on("submit", function (e) {
    e.preventDefault(); Utils.clearMessage("#message");
    const d = { name: $.trim($("#name").val()), email: $.trim($("#email").val()).toLowerCase(), mobile: $.trim($("#mobile").val()), password: $("#password").val(), confirmPassword: $("#confirmPassword").val() };
    const errors = Validate.registration(d);
    Utils.showFieldErrors(errors);
    if (!$.isEmptyObject(errors)) return;
    const $btn = $("#registerBtn"); Utils.setLoading($btn, true, "Creating account...");

    AuthAPI.register(d.email, d.password).then(function (res) {
      Session.save(res);
      // Credit starts at 0 and only the admin can raise it (enforced by the security rules).
      const profile = { id: res.localId, name: d.name, email: d.email, mobile: d.mobile, creditLimit: 0, creditUsed: 0, active: true, createdAt: Date.now() };
      return DB.patch("customers/" + res.localId, profile).then(function () { return res; });
    }).then(function (res) {
      return AuthAPI.sendVerificationEmail(res.idToken).then(
        function () { return { verificationSent: true }; },
        function (error) { return { verificationSent: false, error: error }; }
      );
    }).done(function (result) {
      Session.clear();
      if (result.verificationSent) {
        Utils.showMessage("#message", "Account created. Check your email, verify your address, then sign in.", "success");
      } else {
        Utils.showMessage("#message", "Account created, but the verification email could not be sent: " + AuthAPI.friendlyError(result.error), "error");
      }
      Utils.setLoading($btn, false, "Create account");
    }).fail(function (err) {
      Session.clear();
      Utils.showMessage("#message", AuthAPI.friendlyError(err), "error");
      Utils.setLoading($btn, false, "Create account");
    });
  });

  /* One login form routes active admins to the dashboard and customers to the shop. */
  $("#loginForm").on("submit", function (e) {
    e.preventDefault(); Utils.clearMessage("#message");
    const d = { email: $.trim($("#email").val()).toLowerCase(), password: $("#password").val() };
    const errors = Validate.login(d);
    Utils.showFieldErrors(errors);
    if (!$.isEmptyObject(errors)) return;
    const $btn = $("#loginBtn"); Utils.setLoading($btn, true, "Logging in...");
    pendingVerificationToken = null;
    $("#resendAdminVerification").addClass("hidden");

    AuthAPI.login(d.email, d.password).then(function (res) {
      Session.save(res);
      return $.when(AuthAPI.lookup(res.idToken), DB.get("users/" + res.localId)).then(function (info, user) {
        const role = user && typeof user.role === "string" ? user.role.toLowerCase() : "";
        const emailVerified = !!(info && info.users && info.users[0] && info.users[0].emailVerified === true);
        if (role === "admin") {
          if (user.role !== "Admin") {
            Session.clear();
            return $.Deferred().reject("ADMIN_ROLE_SETUP").promise();
          }
          if (user.isActive !== true) {
            Session.clear();
            return $.Deferred().reject("ADMIN_INACTIVE").promise();
          }
          if (!emailVerified) {
            pendingVerificationToken = res.idToken;
            Session.clear();
            return { needsVerification: true, isAdmin: true };
          }
          Session.save($.extend({}, res, { role: "Admin" }));
          return { destination: "../admin/dashboard.html" };
        }

        if (!emailVerified) {
          pendingVerificationToken = res.idToken;
          Session.clear();
          return { needsVerification: true, isAdmin: false };
        }

        return DB.get("customers/" + res.localId).then(function (profile) {
          if (!profile) {
            Session.clear();
            return $.Deferred().reject("PROFILE_MISSING").promise();
          }
          if (profile.active !== true) {
            Session.clear();
            return $.Deferred().reject("ACCOUNT_INACTIVE").promise();
          }
          return { destination: Utils.safeNext() || "home.html" };
        });
      });
    }).done(function (result) {
      if (result.needsVerification) {
        const message = result.isAdmin
          ? "Verify this admin email before continuing. Send a verification link, then return here and log in again."
          : "Verify your email before continuing. Send a verification link, then return here and log in again.";
        Utils.showMessage("#message", message, "info");
        $("#resendAdminVerification")
          .text(result.isAdmin ? "Resend admin verification email" : "Resend verification email")
          .removeClass("hidden");
        Utils.setLoading($btn, false, "Log in");
        return;
      }
      location.href = result.destination;
    }).fail(function (err) {
      Session.clear();
      Utils.showMessage("#message", loginMessage(err), "error");
      Utils.setLoading($btn, false, "Log in");
    });
  });

  $("#resendAdminVerification").on("click", function () {
    if (!pendingVerificationToken) return;
    AuthAPI.sendVerificationEmail(pendingVerificationToken)
      .done(function () { Utils.showMessage("#message", "Verification email sent. Check your inbox, verify the address, then log in again.", "success"); })
      .fail(function (err) { Utils.showMessage("#message", AuthAPI.friendlyError(err), "error"); });
  });

  /* PASSWORD RESET (Firebase sends the email) */
  $("#resetForm").on("submit", function (e) {
    e.preventDefault(); Utils.clearMessage("#message");
    const email = $.trim($("#email").val()).toLowerCase(), errors = {};
    if (!Validate.required(email)) errors.email = "Email is required."; else if (!Validate.email(email)) errors.email = "Enter a valid email address.";
    Utils.showFieldErrors(errors);
    if (!$.isEmptyObject(errors)) return;
    const $btn = $("#resetBtn"); Utils.setLoading($btn, true, "Sending...");
    AuthAPI.sendPasswordReset(email)
      .done(function () { Utils.showMessage("#message", "If an account exists for this email, a reset link has been sent.", "success"); })
      .fail(function (err) { Utils.showMessage("#message", AuthAPI.friendlyError(err), "error"); })
      .always(function () { Utils.setLoading($btn, false, "Send reset link"); });
  });
});
