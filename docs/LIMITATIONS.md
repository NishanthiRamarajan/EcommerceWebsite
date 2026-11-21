# Security and data limitations

This project is a static frontend using Firebase Authentication REST and Firestore REST. It has no trusted server code and is not a production payment or order-processing system.

## 1. Browser-local data is not authoritative

- Firebase Authentication identifies the signed-in customer. Product/catalog and customer-profile information continue to use Firestore.
- Checkout orders, stock adjustments, credit usage, and checkout notifications are stored in LocalStorage. They are separate from Firestore records, editable by the browser user, and limited to the same browser profile and site origin.
- Browser-side price, stock, and credit validation can be bypassed. LocalStorage cannot provide secure inventory reservation, cross-device synchronization, or authoritative order history.
- Firestore security rules protect Firestore requests only; they do not protect or validate LocalStorage data.
- Authentication tokens are stored in LocalStorage, which a cross-site-scripting bug could read. The app escapes user text with `Utils.esc`; keep doing so and avoid unsafe HTML insertion.

## 2. Checkout and payment behavior

| Data/action | Current source or behavior |
|---|---|
| Customer identity | Firebase Authentication REST |
| Catalog and customer profile/credit limit | Firestore REST reads |
| Orders, stock adjustments, credit usage, checkout messages | Browser LocalStorage |
| Cash on Delivery | Order is recorded as pending; no money is collected |
| Store credit | Browser-local usage only; no real charge or Firestore credit write |
| Firestore payment records | Existing/legacy records remain separate from current checkout |
| Trusted transaction | Not available in this browser-only architecture |

Admin credit limits and repayment records are Firestore data, while checkout credit usage is browser-local. This separation can cause the customer-management balance and checkout availability to disagree until the credit workflows are reconciled. Do not treat either browser-local checkout values or client-calculated totals as authoritative.

Cancelling a browser-local order restores its browser-local stock and credit usage once. It does not update Firestore inventory or send a refund to a payment provider.

## 3. Browser storage

- **LocalStorage** persists until cleared, but is available only to the same browser profile and site origin. It stores the cart, login session, and browser-local checkout data.
- **Cookies** mirror some wishlist/preferences/recently-viewed data; they are not an order database.
- **SessionStorage** is not used for the cart because the cart should survive closing the tab.
- Clearing site data or changing browser/device can make browser-local orders, stock adjustments, and credit usage unavailable.

## 4. Other limits

- Admin pages also read actual Firestore collections. A denied Firestore request can still affect features that depend on that collection; browser-local orders and messages are separate.
- Reports currently download Firestore data client-side and some report types request unrelated collections. Large collections may be slow, and a denied request may fail the report.
- Pagination is client-side after records are downloaded. Add Firestore cursors and server-side paging before scaling to large collections.
- Order emails are not sent; invoices can be printed from the browser.
- No payment gateway or verified server-side callback is connected.
- Firebase Storage for new projects may require a pay-as-you-go plan. Public image URLs continue to work independently.
- Browsing products without login is allowed where Firestore rules allow public catalog reads; active-product filtering is also applied by the page.
