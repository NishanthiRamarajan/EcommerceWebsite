# Online Shopping (HTML/CSS/JS/jQuery + Google Firebase: Auth + Firestore REST)
## Setup
1. console.firebase.google.com > Add project > Build > Authentication > Get started > enable Email/Password.
2. Build > Firestore Database > Create database (production mode).
3. Project settings > copy Project ID + Web API Key into `js/firebase-config.js`. Set ADMIN_EMAIL (same email in `firestore.rules`).
4. Firestore > Rules > paste `firestore.rules` > Publish.
5. VS Code > Extensions > "Live Server" > right-click `login.html` > Open with Live Server.
6. Sign Up with the ADMIN_EMAIL once (becomes admin), add categories + products, then sign up a normal customer in another browser.
## Postman
Sign in: POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY  body {"email","password","returnSecureToken":true} -> copy idToken.
Then header `Authorization: Bearer <idToken>`:
GET  https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents/inventory
PATCH .../documents/inventory/P1  body {"fields":{"title":{"stringValue":"Phone"},"qty":{"integerValue":"10"}}}
DELETE .../documents/inventory/P1
## Git (Azure DevOps Repos)
git init && git add . && git commit -m "Initial project structure"
git remote add origin <AZURE_REPO_URL> && git branch -M main && git push -u origin main
