# Phase guide (learn it phase by phase)

Read one phase, open the listed files, run the test, then commit. Each phase builds on the one before.
Always test an API in Postman (`OnlineShopping.postman_collection.json`) before you trust the frontend code that uses it.

---
## Phase 1 - Project setup and architecture
**Idea:** four layers: pages -> app logic -> API files -> Firebase. Only `js/api/*.js` talk to the network, so a URL or header is fixed in one place.
**Files:** the folder tree in README, `css/common.css` (colours and components as CSS variables), `index.html`.
**Test:** open `index.html` with Live Server; the shop home loads (empty until Firebase is configured).
**Common errors:** opening with `file://` (cookies fail); wrong script order (`jQuery` must load first, then `firebase-config`, `session`, `auth-api`, `database-api` ...).
**Git:** `git init`, `git add .`, `git commit -m "chore: initial project structure"`, connect GitHub (docs/GIT-GUIDE.md).
**Exercise:** change `--green` in `common.css` and watch the whole site change.

## Phase 2 - Firebase setup and authentication
**Idea:** the *API key* only identifies your project (public). An *ID token* proves who the user is and is sent as a Bearer token. A *refresh token* gets a new ID token (`AuthAPI.getValidToken`). Firestore rules decide what each user may read/write.
**Files:** `firebase-config.js`, `database-api.js`, `session.js`, `auth-api.js`, `customer/auth.js`, `docs/firestore.rules`.
**Test:** Postman collection Authentication; register in the site; confirm `customers/{uid}` exists with credit 0/0; admin login with a matching active `users/{uid}` Admin document.
**Common errors:** `EMAIL_EXISTS`, `INVALID_LOGIN_CREDENTIALS`, `WEAK_PASSWORD`; `NOT_FOUND` = wrong project ID or Firestore is not enabled; `PERMISSION_DENIED` = rules not published, mismatched user document ID, or missing Admin role.
**Git:** `feat(auth): registration, login, reset, admin login`.
**Exercise:** in Postman try to change your own `creditLimit` and confirm Firestore returns 403 `PERMISSION_DENIED`.

## Phase 3 - Category CRUD
**Idea:** Firestore REST uses documents and typed fields. The `DB.*` wrapper keeps familiar app calls while storing one category per document. Deleting is blocked when `inventory` still has products with that `catId` (`DB.query`).
**Files:** `admin/categories.html`, `admin/category.js`, `admin-layout.js`.
**Test:** add, edit, deactivate, delete a category; try deleting one that has products.
**Git:** `feat(category): category CRUD`. **Exercise:** show how many products each category has.

## Phase 4 - Inventory CRUD and image upload
**Idea:** the product ID is the database key (`inventory/P1001`) so it is unique and cannot change. Soft delete = `active:false`; hard delete removes the record but old orders keep their own copy of name/price.
**Files:** `admin/inventory.html`, `admin/inventory.js`, `storage-api.js`, `validation.js`, `docs/storage-rules.txt`.
**Test:** add a product by URL and by upload; quantity 0 shows Out of stock; negative quantity and price 0 are refused.
**Common errors:** upload 404/403 = Storage not enabled or rules not published; image over 2 MB.
**Git:** `feat(inventory): inventory CRUD with image upload`. **Exercise:** add a "Sort by price" option to the admin table.

## Phase 5 - Customer management and credit limits
**Idea:** `Available = Credit Limit - Credit Used`. The customer can never change either (rules). The admin sets the limit and lowers Credit Used with **Record payment**.
**Files:** `admin/customers.html`, `admin/customers.js`.
**Test:** set a limit, deactivate a customer (login is refused afterwards).
**Git:** `feat(customers): credit limit management`. **Exercise:** add a "customers near their limit" filter.

## Phase 6 - Customer shopping interface
**Idea:** customers only see active products in active categories; out-of-stock products are shown but cannot be added. Search is plain JavaScript `filter()` on the loaded list (client-side first).
**Files:** `shop.js`, `layout.js`, `home.js`, `products.js`, `product-details.js`, `customer.css`.
**Test:** search by name and ID, category filter, sort, pagination, stock badges.
**Git:** `feat(shop): home, product list, product details`. **Exercise:** add a price-range filter.

## Phase 7 - Cart and LocalStorage
**Idea:** *LocalStorage* keeps data until you clear it (needed: the cart must survive closing the browser). *SessionStorage* dies with the tab. The cart key is `cart_<uid>` so two customers on one computer never share a cart. The cart page re-checks every line against Firebase.
**Files:** `cart.js`. **Test:** README test checklist steps 3 and 4.
**Common errors:** quantity above stock (reduced automatically), item removed by admin (flagged, checkout blocked).
**Git:** `feat(cart): cart with LocalStorage persistence`. **Exercise:** show a "saved for later" list.

## Phase 8 - Wishlist and cookies
**Idea:** *Cookies* are small (about 4 KB), sent to the server with requests, and can expire; good for recently viewed and preferences. *LocalStorage* is bigger and stays in the browser. Never store passwords or tokens in cookies. The wishlist itself lives in Firebase (`wishlists/<uid>`); the cookie mirror makes hearts and the home section appear instantly.
**Files:** `wishlist.js`, `cookies.js`. **Test:** favourite a product, close the browser, reopen: it is still a favourite on the home page.
**Git:** `feat(wishlist): wishlist and cookies`. **Exercise:** remember the last selected category in a cookie.

## Phase 9 - Checkout and billing
**Status:** checkout stores orders, stock adjustments, credit usage, and checkout notifications in browser LocalStorage. These records are browser-local, editable, and not authoritative; Cash on Delivery and store credit are simulations that collect no money.
**Files:** `checkout.js`, `bill.js`. **Test:** README checklist 5 and 6; the checkout page must show the pause notice and place no order.
**Common errors:** a customer order write should be rejected by the published Firestore rules; implement a trusted transactional backend before enabling purchases.
**Git:** `feat(checkout): cash and credit checkout with bill`. **Exercise:** explain why browser storage cannot securely validate prices, reserve inventory, or enforce credit across users/devices.

## Phase 10 - Order management
**Idea:** status flow pending -> confirmed -> shipped -> delivered. Customer order history can display existing orders; new customer orders require the backend described in Phase 9. Admin cancellation restores stock/credit based on current reads, so use a trusted backend transaction for concurrent sales.
**Files:** `customer/orders.js`, `admin/orders.js`. **Test:** verify existing order history and admin status updates; don't test a new customer purchase until checkout backend exists.
**Git:** `feat(orders): order history and admin order management`. **Exercise:** add a status timeline to the order modal.

## Phase 11 - Admin reports
**Idea:** reports are `filter()` -> `map()` -> `reduce()` -> `sort()` -> `slice()` over arrays. Dates: start of the From day to the end of the To day. Cancelled orders are excluded.
**Files:** `reports.js`, the three `reports-*.html`. **Test:** run every report with and without dates.
**Git:** `feat(reports): customer, inventory and sales reports`. **Exercise:** export a report to CSV with a `Blob` download.

## Phase 12 - Validation, testing and deployment
**Idea:** frontend validation helps users; rules protect data. Test on desktop, tablet and phone widths, with wrong inputs, and with two browsers at once. Deploy by pushing to GitHub and enabling GitHub Pages (add the `username.github.io` domain to Authentication > Settings > Authorized domains), or use Firebase Hosting.
**Git:** `docs: final documentation`, then `git push`. **Exercise:** write 10 test cases in a table and tick them.
