import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBFMS5HMzrG1z5CRiOgYGlPyza2FwaEo9I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "galleyodd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "galleyodd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "galleyodd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "912965695422",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:912965695422:web:a0211f038f44bcf0ec6bef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-C23BZC9GSV",
};

if (!firebaseConfig.apiKey) {
  throw new Error("Missing VITE_FIREBASE_API_KEY. Add it to frontend/.env.local.");
}

const app = initializeApp(firebaseConfig);

const appCheckSiteKey = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "").trim();
const appCheckDebugToken = (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || "").trim();

export async function executeRecaptchaAction(action) {
  if (import.meta.env.DEV) {
    return null;
  }

  if (!appCheckSiteKey || !window.grecaptcha?.enterprise) {
    throw new Error("reCAPTCHA Enterprise is not available. Refresh the page and try again.");
  }

  await new Promise((resolve) => window.grecaptcha.enterprise.ready(resolve));
  const token = await window.grecaptcha.enterprise.execute(appCheckSiteKey, { action });
  if (!token) {
    throw new Error("reCAPTCHA Enterprise did not return a verification token.");
  }
  return token;
}

if (appCheckDebugToken && import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken === "true"
    ? true
    : appCheckDebugToken;
}

if (import.meta.env.DEV && appCheckDebugToken && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (!import.meta.env.DEV && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (!import.meta.env.DEV) {
  throw new Error(
    "Missing VITE_FIREBASE_APPCHECK_SITE_KEY. Configure Firebase App Check before using production."
  );
}

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const functions = getFunctions(app, "us-central1");

export default app;
