# Firebase API reference

The app uses Firebase Authentication REST, Cloud Firestore REST, and Firebase Storage REST. Configure the Postman collection variables `apiKey` and `projectId`; run **Login** to save `idToken`, `refreshToken`, and `uid`.

## Authentication

Base URL: `https://identitytoolkit.googleapis.com/v1`

| Purpose | Method + endpoint | JSON body |
|---|---|---|
| Register | `POST /accounts:signUp?key={{apiKey}}` | `{"email":"...","password":"...","returnSecureToken":true}` |
| Login | `POST /accounts:signInWithPassword?key={{apiKey}}` | same |
| Verify email | `POST /accounts:sendOobCode?key={{apiKey}}` | `{"requestType":"VERIFY_EMAIL","idToken":"{{idToken}}"}` |
| Password reset | `POST /accounts:sendOobCode?key={{apiKey}}` | `{"requestType":"PASSWORD_RESET","email":"..."}` |
| Check verification | `POST /accounts:lookup?key={{apiKey}}` | `{"idToken":"{{idToken}}"}` |
| Refresh | `POST https://securetoken.googleapis.com/v1/token?key={{apiKey}}` | form fields `grant_type=refresh_token`, `refresh_token={{refreshToken}}` |

Auth errors use HTTP 400 with a Firebase error code in `error.message`.

## Cloud Firestore REST

Base URL:

```text
https://firestore.googleapis.com/v1/projects/{{projectId}}/databases/(default)/documents
```

For private requests, set `Authorization: Bearer {{idToken}}`. JSON write bodies use Firestore REST typed values (for example, `{"fields":{"name":{"stringValue":"Phones"},"active":{"booleanValue":true}}}`). Add `?key={{apiKey}}` to requests.

| Purpose | Method + URL | Details |
|---|---|---|
| List categories | `GET .../documents/categories?pageSize=1000` | Public read; response has `documents[]`. |
| Read a product | `GET .../documents/inventory/P1001` | Document fields are under `fields`. |
| Query category products | `POST .../documents:runQuery` | Body: `{"structuredQuery":{"from":[{"collectionId":"inventory"}],"where":{"fieldFilter":{"field":{"fieldPath":"catId"},"op":"EQUAL","value":{"stringValue":"C-PHONES"}}}}}` |
| Create/replace category | `PATCH .../documents/categories/C-TEST` | Send a document body with `fields`. |
| Update category name | `PATCH .../documents/categories/C-TEST?updateMask.fieldPaths=name` | Send only `{"fields":{"name":{"stringValue":"Phones"}}}`. |
| Delete a category | `DELETE .../documents/categories/C-TEST` | Admin role required. |

The application stores categories, inventory, customers, and orders as collections of documents. An order document is `orders/{orderId}` and contains `customerId`; customer order reads are filtered by `customerId`. Wishlist entries are `wishlists/{uid}/products/{productId}`. The app maps these to its existing `DB.*` calls.

Firestore creates a collection when its first document is written; there is no separate “create collection” request. See [FIRESTORE-SETUP.md](./FIRESTORE-SETUP.md) for the required document shapes, rules, and Postman walkthrough.

## Browser-local checkout

Checkout uses Firebase Authentication REST for the signed-in customer and Firestore REST reads for catalog/profile data. Order records, stock adjustments, credit usage, and checkout notifications are stored in LocalStorage by the shared browser-storage module. Checkout does not call `DB.createMany` or write order, payment, stock, or credit records to Firestore.

The browser calculates prices and totals, and LocalStorage can be modified by the user or cleared by the browser. These records are limited to the same browser profile and site origin. Cash on Delivery and store credit are simulations; no payment provider is connected and no money is collected. See [FIRESTORE-SETUP.md](./FIRESTORE-SETUP.md) and [LIMITATIONS.md](./LIMITATIONS.md).

## Storage

Base URL: `https://firebasestorage.googleapis.com/v0/b/{{bucket}}/o`

| Purpose | Method + endpoint | Headers/body |
|---|---|---|
| Upload | `POST .../o?name=products%2FP1001.jpg` | `Authorization: Firebase {{idToken}}`; binary body |
| Download | `GET .../o/products%2FP1001.jpg?alt=media&token={{downloadToken}}` | - |
| Delete | `DELETE .../o/products%2FP1001.jpg` | `Authorization: Firebase {{idToken}}` |

Postman does not enforce browser CORS. If Postman succeeds but the page fails, check the browser console, Firebase rules, and the URL.
