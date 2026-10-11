import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { ALLOWED_DOMAIN, isAllowedEmail } from "./pr";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!config.apiKey && !!config.projectId && !!ALLOWED_DOMAIN;

// Lazy so the landing page (and the build) never touches Firebase until the panel needs it.
export function fb() {
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}

export class DomainError extends Error {}

export async function signIn() {
  const { auth } = fb();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });
  try {
    const { user } = await signInWithPopup(auth, provider);
    if (!isAllowedEmail(user.email)) {
      await signOut(auth);
      throw new DomainError();
    }
  } catch (e) {
    const code = (e as { code?: string }).code;
    // in-app browsers (WhatsApp, Instagram) block popups
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}
