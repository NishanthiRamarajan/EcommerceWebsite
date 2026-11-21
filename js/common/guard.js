/* guard.js - decides which screen to show. This is NOT security: anyone can edit JavaScript in their browser.
   The Firebase security rules are what actually protect the data. */
const Guard = {
  requireLogin: function (loginPage) {
    if (Session.isLoggedIn()) return true;
    const here = location.pathname.split("/").pop() + location.search;
    location.href = loginPage + "?next=" + encodeURIComponent(here);
    return false;
  },
  requireAdmin: function (loginPage) {
    if (Session.isLoggedIn() && Session.isAdmin()) return true;
    location.href = loginPage;
    return false;
  },
  // Clears only the login session. The cart (cart_<uid>) stays in LocalStorage for the next login.
  logout: function (loginPage) { Session.clear(); location.href = loginPage; }
};
