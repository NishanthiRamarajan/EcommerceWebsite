/* =====================================================================
   firebase-config.js  (Layer 3: API communication)
   STEP 1: replace the placeholders with the values from your Firebase
           console (Project settings > Your apps > Web app).
   The Firestore admin role is stored in users/{uid}; see docs/firestore.rules.
   The web API key is a public identifier, not a secret. Real protection
   comes from the Firebase security rules.
   NEVER put a service-account key in this project.
   ===================================================================== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDWcINlUqWWCEvbkhZNZ-8zvX5gnLeEUE",
  authDomain: "ecommerce-33967.firebaseapp.com",
  projectId: "ecommerce-33967",
  storageBucket: "ecommerce-33967.firebasestorage.app"   // optional until you use image upload
};

const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1";
const TOKEN_URL = "https://securetoken.googleapis.com/v1/token";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/" +
  encodeURIComponent(FIREBASE_CONFIG.projectId) + "/databases/(default)/documents";
