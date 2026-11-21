# Switch this project to Cloud Firestore

The Firebase project can have Realtime Database and Cloud Firestore enabled at the same time. They are separate databases: enabling Firestore does **not** copy or remove Realtime Database data. This app now sends its database calls to Firestore.

## 1. Enable Firestore and Authentication

1. Open the Firebase console and select project `ecommerce-33967`.
2. Select **Build > Firestore Database > Create database**. Choose a location near your users; the database location cannot be changed later. Start in production/locked mode.
3. Under **Build > Authentication > Sign-in method**, enable **Email/Password**.
4. In **Project settings > General > Your apps**, open the Web app config. Confirm that `apiKey`, `projectId`, `authDomain`, and (if using uploads) `storageBucket` in [firebase-config.js](../js/api/firebase-config.js) match it. `databaseURL` is not used by this Firestore setup.

The web API key identifies the Firebase project; it is not an admin credential. Never put a service-account key in this browser app or Postman.

## 2. Make your admin role document match Firebase Auth

1. In **Authentication > Users**, create or locate the admin account and copy its **User UID**.
2. In **Firestore Database > Data**, create or open collection `users`.
3. The admin document's **Document ID must be exactly the Auth User UID** (not an email address or a separate random ID). Add these fields:

   | Field | Type | Value |
   |---|---|---|
   | `userId` | string | same Auth UID |
   | `role` | string | `Admin` (case-sensitive) |
   | `isActive` | boolean | `true` |

   The app and rules read `users/{uid}`. If your existing `users` document ID is not that UID, create a matching document; a `userId` field alone is not enough.
4. Verify the admin email in Firebase Authentication. The admin login checks both the verified email and the active Firestore role.

Do not let public users create or edit their own `users` role documents. The admin user document is manually managed in the Firebase console.

## 3. Publish Firestore security rules

1. Open **Firestore Database > Rules** (not Realtime Database > Rules).
2. Replace the rules with the contents of [firestore.rules](./firestore.rules) and click **Publish**.
3. Keep the old Realtime Database rules out of this screen. Realtime Database JSON rules are not Firestore rules.

The provided rules use `users/{uid}.role == "Admin"` and `isActive == true`, allow public reads of categories/products, and restrict customer data to its owner/admin. The rules also retain permissions for older Firestore order/payment/notification records. The current checkout stores orders, stock adjustments, credit usage, and its order notifications in browser storage; it does not write those records to Firestore. Do not change or republish rules to enable browser-local checkout.

## 4. Create app data

Firestore collections appear automatically when the first document is created. There is no separate collection-creation step.

| Collection/path | How it is populated |
|---|---|
| `users/{uid}` | Create the admin role document as in step 2. |
| `categories/{categoryId}` | Admin creates categories in the app or using the Postman request. |
| `inventory/{productId}` | Admin creates products in the app or using Postman. |
| `customers/{uid}` | Created when a customer registers in the app. |
| `orders/{orderId}` | Legacy Firestore order records; current checkout orders are stored in the browser. |
| `payments/{paymentId}` | Existing Firestore payment records; current checkout does not create payment documents. |
| `adminNotifications/{notificationId}` | Firestore admin messages may still be read by the dashboard; current checkout order messages are stored in the browser. |
| `wishlists/{uid}/products/{productId}` | Created when the customer saves a product. |

For manual/Postman seeding, create category documents with `id` (string, same as document ID), `name` (string), and `active` (boolean). Product documents should include the fields used by the app: `id`, `catId`, `title`, `description`, `quantity`, `price`, `imageUrl`, `featured`, `active`, `soldCount`, `createdAt`, and `updatedAt`. `storagePath` is optional and is only used to clean up legacy Firebase Storage uploads. Keep `quantity`, `price`, and time fields numeric; use a boolean Firestore type for flags. Create categories before products and make each product's `catId` match a category document ID.

`docs/sample-data.json` is an old Realtime Database export format; it cannot be imported into Firestore as-is. Recreate/convert those records to individual documents. Existing Realtime Database records are not automatically moved.

## 5. Test with Postman, in order

1. Import [OnlineShopping.postman_collection.json](./OnlineShopping.postman_collection.json) into Postman.
2. In the collection's **Variables** tab, confirm `projectId` is `ecommerce-33967` and `apiKey` matches the Web app config. Avoid saving your password or ID token in a shared workspace.
3. Run **1 Authentication > Login** using the admin account. The request saves `uid`, `idToken`, and `refreshToken` to collection variables. If needed, use **Send verification email**, verify, then run Login again.
4. Run **3 Admin Firestore writes > Read my admin role document**. Confirm the returned resource is `users/{uid}` and includes `role: "Admin"` and `isActive: true`.
5. Run **2 Public Firestore reads > List categories** and **List products**. An empty collection may return no `documents` array; that is normal before seeding.
6. Run **3 Admin Firestore writes > Create category**, **Create test product**, and **Update category name**. For cleanup, run **Delete test product** before **Delete category**. These should succeed only with the active admin token and published Firestore rules.
7. Open the site with VS Code Live Server and use the shared `customer/login.html` page for both account types. Register and verify a customer, then check for `customers/{customer UID}` in Firestore. Sign in with the active admin account and confirm it routes to the dashboard.
8. For security checks, sign in through Postman as a customer so `idToken` and `uid` refer to that customer. Send each request with `Authorization: Bearer {{idToken}}` and `Content-Type: application/json`:
   - `PATCH https://firestore.googleapis.com/v1/projects/{{projectId}}/databases/(default)/documents/customers/{{uid}}?updateMask.fieldPaths=creditLimit&key={{apiKey}}` with body `{"fields":{"creditLimit":{"integerValue":"999999"}}}`.
   - `PATCH https://firestore.googleapis.com/v1/projects/{{projectId}}/databases/(default)/documents/inventory/P-TEST?updateMask.fieldPaths=quantity&key={{apiKey}}` with body `{"fields":{"quantity":{"integerValue":"999999"}}}`.
   - `POST https://firestore.googleapis.com/v1/projects/{{projectId}}/databases/(default)/documents/orders?documentId=SECURITY-TEST&key={{apiKey}}` with body `{"fields":{"orderId":{"stringValue":"SECURITY-TEST"},"customerId":{"stringValue":"{{uid}}"},"status":{"stringValue":"pending"},"totalAmount":{"integerValue":"1"}}}`.

   All three writes must be rejected with HTTP 403 / `PERMISSION_DENIED`. Ensure `P-TEST` exists for the inventory check. Sign back in as admin before repeating allowed admin writes.

If Postman returns `PERMISSION_DENIED`, check that the token belongs to this project, the admin document ID equals the UID, both role fields have the right types/values, and you published the rules in Firestore. If it returns `NOT_FOUND`, check the project ID and that Cloud Firestore (default database) was created.

## 6. Browser-local checkout

The checkout uses Firebase Authentication REST to identify the customer and Firestore REST reads for the current catalog and customer profile. It stores orders, local stock adjustments, credit usage, and order messages in LocalStorage; it does not write checkout orders, payments, stock, or credit to Firestore. Only COD and simulated store credit are offered, and no money is collected.

Browser storage is editable, limited to this browser profile and site origin, and not synchronized across devices. The app's other Firestore features still depend on the rules and active account roles described above. Do not use browser-local checkout for real sales or payments.

For Firestore REST request formats see [API-REFERENCE.md](./API-REFERENCE.md).
