# Online Shopping - electronics store (Admin + Customer)

**HTML5, CSS3, vanilla JavaScript, and jQuery** use Firebase REST APIs for Authentication and Firestore.
No framework or Bootstrap. Git + GitHub for version control, Postman for API testing.

Two interfaces share one Firebase project:

| Interface | Start page | Who |
|---|---|---|
| Customer shop | `customer/home.html` (or `index.html`) | everyone registers as a customer |
| Admin dashboard | `customer/login.html` (shared sign-in) | account with active Admin role in Firestore |

## 1. Folder structure (4 layers kept separate)

```
online-shopping/
├── index.html                 redirects to the shop
├── admin/                     Layer 1: admin pages (shared-login redirect, dashboard, categories, inventory, customers, orders, 3 report pages)
├── customer/                  Layer 1: shop pages (home, products, product-details, cart, checkout, wishlist, orders, profile, login, register, reset-password)
├── css/        common.css  customer.css  admin.css
├── js/
│   ├── api/        Layer 3: firebase-config.js  auth-api.js  database-api.js  storage-api.js  cloudinary-api.js
│   ├── common/     Layer 2: session  utils  validation  guard  pagination  cookies  bill
│   ├── customer/   Layer 2: layout  shop  cart  wishlist  auth  home  products  product-details  checkout  orders  profile
│   └── admin/      Layer 2: admin-layout  dashboard  category  inventory  customers  orders  reports
└── docs/           firestore.rules  storage-rules.txt  sample-data.json
                    OnlineShopping.postman_collection.json  FIRESTORE-SETUP.md  PHASE-GUIDE.md  API-REFERENCE.md  LIMITATIONS.md  GIT-GUIDE.md
```
Layer 4 is Firebase itself. Rule of the project: pages -> app logic -> `DB.*` / `AuthAPI.*` / `StorageAPI.*` -> Firebase.

## 2. Set up

1. **Firebase project**: console.firebase.google.com > Add project. Project settings > Your apps > Web (`</>`) and copy the config values.
2. **Authentication** > Get started > Sign-in method > enable **Email/Password**.
3. **Cloud Firestore** > Create database in locked/production mode. Choose the location carefully; it cannot be changed later.
4. Open `js/api/firebase-config.js` and confirm the Web app config. The Realtime Database `databaseURL` is not used.
5. Follow [docs/FIRESTORE-SETUP.md](docs/FIRESTORE-SETUP.md) to create the UID-matched `users/{uid}` Admin document and publish `docs/firestore.rules` under **Firestore Rules**.
6. Create category and inventory documents individually or with the included Postman collection. `docs/sample-data.json` is in the old Realtime Database export format; it cannot be imported into Firestore unchanged.
7. Start a local server: VS Code > install **Live Server** > right-click `index.html` > Open with Live Server. (Do not open files with `file://`: cookies and some browser features need `http://`.)
8. Use the shared sign-in page (`customer/login.html`) for either account type. A customer goes to the shop; a verified account with `role: "Admin"` and `isActive: true` goes to the dashboard. The old `admin/login.html` URL redirects there.
9. Open `customer/register.html`, create a customer, verify the email, then in the admin dashboard > Customer Management give that customer a credit limit.

Checkout is a **browser-local workflow** and needs no Node.js or Cloud Functions. Firebase Authentication identifies the customer; product and customer-profile data are read through Firestore REST. Orders, stock adjustments, credit usage, and order notifications are stored in this browser's LocalStorage, not Firestore. They are not shared with other browsers or devices. COD and store credit are simulations; no payment is collected. Publishing Firestore rules is not required for these local order writes, but rules still protect the app's Firestore features.

Product image uploads use the unsigned Cloudinary preset configured in `js/api/cloudinary-api.js`; the admin form stores the returned secure URL in the product's `imageUrl`, which is used by the shop pages. Keep the preset unsigned and restrict its allowed formats and file size in Cloudinary. Never put a Cloudinary API secret in browser code. Existing image URLs (including legacy Firebase Storage URLs) can still be used.

To import the supplied catalogs, sign in as Admin and open Inventory Management. Click **Import Accessories (12)**, **Import Kids Clothing (9)**, or **Import Women's Clothing (15)**. Both clothing imports use the same Clothing category; existing matching product IDs are left unchanged.

## 3. Using the Firebase APIs in your own code

```javascript
// Read (public data needs no login)
DB.get("inventory/P1001").done(function (p) { console.log(p.title); });
// Filter (some compound Firestore queries may require a composite index)
DB.query("inventory", { orderBy: "catId", equalTo: "C-PHONES" }).done(console.log);
// Write: put = replace, patch = change some fields, post = new auto-ID, remove = delete
DB.patch("inventory/P1001", { price: 18499 }).done(...).fail(function (xhr) { Utils.toast(AuthAPI.friendlyError(xhr), "error"); });
// Several paths in ONE all-or-nothing request
DB.multiUpdate({ "categories/C1/name": "Phones", "wishlists/uid1/P1": true });
// Login
AuthAPI.login(email, password).done(function (res) { Session.save(res); });
```
`DB.*` attaches the ID token automatically and refreshes it when it expires. Firestore collections are created by the first write. Test calls in Postman first (`docs/OnlineShopping.postman_collection.json`, see `docs/API-REFERENCE.md`).

## 4. What is implemented (all items from the assignment)

- **Auth**: register (name, email, mobile, password, confirm), login, password reset email, email verification, token refresh, logout, Firestore Admin role, active-account check.
- **Admin**: dashboard cards and order notifications; category CRUD (delete blocked while products use it); inventory CRUD with ID locked on update, activate/deactivate, hard delete with Yes/No, search by name/ID, category filter, pagination, image URL or Cloudinary upload, and admin-only catalog imports; customer search/profile/credit limit/record payment/activate-deactivate; orders, COD payment confirmation, bill print, and status flow (pending, confirmed, shipped, delivered, cancelled).
- **Reports** (date filters, pagination, JS map/filter/reduce/sort/slice): Firestore customers, inventory, and legacy order/payment reports; browser-local order sales are shown separately. Cancelled orders are excluded from sales.
- **Shop**: home (hero, search, categories, featured, trending, recently added, favourites, recently viewed), product search (all / category / name or ID), pagination, stock badges, disabled Add to Cart when out of stock or inactive.
- **Cart**: add / remove / +/- / typed quantity, never below 1, never above stock, no duplicates, totals update instantly, saved in LocalStorage per user (`cart_<uid>`), survives refresh, closing the browser and logging out/in, and re-validated against Firebase on the cart page.
- **Wishlist and cookies**: wishlist in Firebase (per UID) with a cookie mirror for instant display; cookies also hold recently viewed products and preferences (page size, sort).
- **Checkout**: browser JavaScript rechecks current catalog/profile data, then stores a browser-local order, stock adjustment, credit usage, and admin message in LocalStorage. The invoice is available immediately and in My Orders in the same browser. Client-side checks and LocalStorage can be altered; this is not a trusted order or payment system.

## 5. Decisions you should know about

- **Whole rupees only.** Prices and totals are whole numbers.
- **Credit limit starts at 0.** Only the admin raises it (try 1000 for testing). Checkout only checks the visible limit; it does not increase "Credit Used". Admin **Record payment** updates credit for manually recorded repayments.
- **No order e-mails.** Order notifications are in the admin dashboard. Firebase Auth emails (verify, reset) work. Sending order e-mails would need an email service.
- **Payments are simulated.** The current checkout offers Cash on Delivery and store credit only; neither collects money. Use a provider and verified server-side callbacks before accepting payments.
- **Admin email must be verified** for admin access. Admins must shop using a separate customer account.
- **Featured** products are chosen with a checkbox in the inventory form; **Trending** uses units sold (`soldCount`).

## 6. Test checklist

1. Register -> profile appears under `customers/<uid>` with credit 0/0.
2. With a customer token, try to raise the customer's own credit limit in Postman -> **403 PERMISSION_DENIED**.
3. Add 3 of a product to the cart, close the browser, reopen -> still there. Log out and in -> still there.
4. In admin, change that product's stock to 2 -> cart page shows "Only 2 left" and reduces the quantity; set it to 0 -> flagged, checkout blocked.
5. Sign in as a customer and place a COD or store-credit order. Verify the browser-local order, stock, credit usage, admin message, and invoice in the same browser. Confirm that no checkout order/payment writes appear in Firestore.
6. Confirm a new order appears in admin messages, Order Management, sales reports, and payment transactions.
7. Cancel a test order and confirm the order/payment status changes; stock and credit remain unchanged.

**Honest note:** this project has no trusted server code. Browser-local orders, stock, and credit are editable by the browser user and are not shared or authoritative. Do not use this checkout for real sales or payments. See [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

## 7. Git and GitHub

See `docs/GIT-GUIDE.md` (init, remote, branch per phase, pull request, merge conflicts) and the commit messages in `docs/PHASE-GUIDE.md`.
