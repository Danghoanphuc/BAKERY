import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_APP_ID,
};

const WHOLESALE_APP_NAME = "bakery-wholesale-client";

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

const existingApp = getApps().find((candidate) => candidate.name === WHOLESALE_APP_NAME);

if (!existingApp) {
  app = initializeApp(firebaseConfig, WHOLESALE_APP_NAME);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = existingApp;
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, db, storage };
