import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  startAfter,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, executeRecaptchaAction, functions } from "../firebase";
import { isSecurePassword } from "./validators";

const USER_SESSION_KEY = "galleyodd_session_user";
const ADMIN_SESSION_KEY = "galleyodd_session_admin";
const USER_READ_CACHE_TTL_MS = 30 * 1000;
const ADMIN_USERS_CACHE_TTL_MS = 15 * 1000;
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();

let userReadCache = null;
let userReadPending = null;
let adminUsersCache = null;
let adminUsersPending = null;

export function authErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists with this email address.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use at least 8 characters, including uppercase, lowercase, and a number.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again later.";
    case "auth/firebase-app-check-token-is-invalid":
      return "Firebase security verification failed. Register www.galleryodds.com and galleryodds.com in Firebase App Check, then redeploy.";
    case "auth/email-not-verified":
      return "Verify your email address using the link we sent. Check Spam, Junk, or Promotions if it is not in your inbox, mark it as safe, then sign in again.";
    case "permission-denied":
      return "Firebase denied the profile request. For localhost, register the App Check debug token shown in the browser console. For the deployed site, register www.galleryodds.com and galleryodds.com in Firebase App Check, then deploy firestore.rules.";
    default:
      return error?.message || "Something went wrong. Try again.";
  }
}

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return value;
}

function toSafeUser(data, id) {
  return {
    id,
    fullName: data.fullName || data.username || "",
    username: data.username || data.fullName || "",
    email: data.email || null,
    phone: data.phone || null,
    plan: data.plan || null,
    planPrice: data.planPrice ?? null,
    status: data.status || "active",
    paymentProof: data.paymentProof || null,
    paymentVerified: Boolean(data.paymentVerified),
    subscriptionExpiresAt: toIso(data.subscriptionExpiresAt),
    createdAt: toIso(data.createdAt),
  };
}

function pendingUser(firebaseUser) {
  return toSafeUser({
    email: firebaseUser.email,
    username: "",
    fullName: "",
    status: "active",
    paymentVerified: false,
  }, firebaseUser.uid);
}

async function ensureUserProfile(firebaseUser) {
  const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
  const displayName = firebaseUser.displayName?.trim() || "";
  const fallbackUsername = displayName || firebaseUser.email?.split("@")[0] || "user";
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.username && data.fullName) return cacheUser(toSafeUser(data, snapshot.id));
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      username: data.username || fallbackUsername,
      fullName: data.fullName || displayName || fallbackUsername,
    });
    return readUser(firebaseUser.uid);
  }

  const profile = {
    email: firebaseUser.email,
    username: fallbackUsername,
    fullName: displayName || fallbackUsername,
    status: "active",
    paymentVerified: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", firebaseUser.uid), profile);
  return cacheUser(toSafeUser(profile, firebaseUser.uid));
}

function cacheUser(user) {
  userReadCache = { uid: user.id, user, expiresAt: Date.now() + USER_READ_CACHE_TTL_MS };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  return user;
}

async function readUser(uid) {
  if (userReadCache?.uid === uid && userReadCache.expiresAt > Date.now()) {
    return userReadCache.user;
  }
  if (userReadPending) return userReadPending;
  userReadPending = getDoc(doc(db, "users", uid)).then((snapshot) => {
    const user = snapshot.exists() ? cacheUser(toSafeUser(snapshot.data(), snapshot.id)) : null;
    if (!user) userReadCache = { uid, user, expiresAt: Date.now() + USER_READ_CACHE_TTL_MS };
    userReadPending = null;
    return user;
  }).catch((error) => {
    userReadPending = null;
    throw error;
  });
  return userReadPending;
}

export async function init() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (!firebaseUser) {
        localStorage.removeItem(USER_SESSION_KEY);
        resolve();
        return;
      }
      try {
        if (!firebaseUser.emailVerified) {
          await signOut(auth);
          localStorage.removeItem(USER_SESSION_KEY);
          localStorage.removeItem(ADMIN_SESSION_KEY);
          resolve();
          return;
        }
        const adminSnapshot = await getDoc(doc(db, "admins", firebaseUser.uid));
        if (adminSnapshot.exists()) {
          localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            ...adminSnapshot.data(),
          }));
        } else {
          cacheUser(await ensureUserProfile(firebaseUser));
        }
      } catch (error) {
        console.error("Failed to restore the Firebase session.", {
          code: error?.code,
          message: error?.message,
        });
        await signOut(auth);
        localStorage.removeItem(USER_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      resolve();
    });
  });
}

export function getUserSession() {
  try {
    return JSON.parse(localStorage.getItem(USER_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export async function registerUser({ email, password }) {
  if (!isSecurePassword(password)) {
    const error = new Error("Use at least 8 characters, including uppercase, lowercase, and a number.");
    error.code = "auth/weak-password";
    throw error;
  }
  await executeRecaptchaAction("SIGNUP");
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await sendEmailVerification(credential.user);
  await signOut(auth);
  const error = new Error("Verify your email address using the link we sent. Check Spam, Junk, or Promotions if it is not in your inbox, mark it as safe, then sign in again.");
  error.code = "auth/email-not-verified";
  throw error;
}

export async function loginUser({ email, password }) {
  await executeRecaptchaAction("LOGIN");
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  if (!credential.user.emailVerified) {
    await signOut(auth);
    const error = new Error("Verify your email address using the link we sent. Check Spam, Junk, or Promotions if it is not in your inbox, mark it as safe, then sign in again.");
    error.code = "auth/email-not-verified";
    throw error;
  }
  return cacheUser(await ensureUserProfile(credential.user));
}

export async function loginWithGoogle() {
  await executeRecaptchaAction("LOGIN");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  const adminSnapshot = await getDoc(doc(db, "admins", credential.user.uid));
  if (adminSnapshot.exists()) {
    await signOut(auth);
    throw new Error("Use the admin sign-in page for administrator access.");
  }
  return cacheUser(await ensureUserProfile(credential.user));
}

export async function refreshUser(userId) {
  userReadCache = null;
  return readUser(userId);
}

export async function resetPassword(email) {
  await executeRecaptchaAction("PASSWORD_RESET");
  const actionCodeSettings = {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: true,
  };

  await sendPasswordResetEmail(auth, email.trim().toLowerCase(), actionCodeSettings);
}

export async function setUsername(userId, username, email) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }
  await auth.currentUser.reload();
  if (!auth.currentUser.emailVerified) {
    throw new Error("Verify your email address, then sign out and sign in again.");
  }
  await auth.currentUser.getIdToken(true);

  const normalized = username.trim().toLowerCase();
  const usernameRef = doc(db, "usernames", normalized);
  const userRef = doc(db, "users", userId);
  const displayName = username.trim();
  const profile = { username: normalized, fullName: displayName };

  await runTransaction(db, async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);
    if (usernameSnapshot.exists()) throw new Error("That username is already taken.");
    transaction.set(usernameRef, { uid: userId, username: normalized });
    transaction.set(userRef, profile, { merge: true });
  });

  return readUser(userId);
}

export function refreshUserSession(updatedUser) {
  userReadCache = { uid: updatedUser.id, user: updatedUser, expiresAt: Date.now() + USER_READ_CACHE_TTL_MS };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
}

export async function logoutUser() {
  await signOut(auth);
  localStorage.removeItem(USER_SESSION_KEY);
}

export async function loginAdmin({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL) {
    throw new Error("This email is not authorized for the admin dashboard.");
  }

  await executeRecaptchaAction("ADMIN_LOGIN");
  const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  if (!credential.user.emailVerified) {
    await signOut(auth);
    const error = new Error("Verify your admin email address before signing in.");
    error.code = "auth/email-not-verified";
    throw error;
  }
  const snapshot = await getDoc(doc(db, "admins", credential.user.uid));
  if (!snapshot.exists()) {
    await signOut(auth);
    throw new Error("This account is not an administrator.");
  }
  const admin = { id: credential.user.uid, email: credential.user.email, ...snapshot.data() };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
  return admin;
}

export async function logoutAdmin() {
  await signOut(auth);
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function chooseSubscription(userId, plan) {
  await updateDoc(doc(db, "users", userId), {
    plan,
    planPrice: plan === "weekly" ? 30000 : 100000,
  });
  userReadCache = null;
  return readUser(userId);
}

export async function savePaymentProof(userId, paymentProof) {
  await updateDoc(doc(db, "users", userId), { paymentProof });
  userReadCache = null;
  return readUser(userId);
}

export async function getAdminUsers(searchQuery = "", { force = false, cursor = null } = {}) {
  if (!cursor && !force && adminUsersCache?.expiresAt > Date.now()) {
    return {
      users: filterAdminUsers(adminUsersCache.users, searchQuery),
      nextCursor: adminUsersCache.nextCursor,
    };
  }
  if (!cursor && adminUsersPending) {
    const result = await adminUsersPending;
    return { users: filterAdminUsers(result.users, searchQuery), nextCursor: result.nextCursor };
  }
  const usersQuery = cursor
    ? query(collection(db, "users"), orderBy(documentId()), startAfter(cursor), limit(25))
    : query(collection(db, "users"), orderBy(documentId()), limit(25));
  const readPage = getDocs(usersQuery).then((snapshot) => {
    const users = snapshot.docs.map((item) => toSafeUser(item.data(), item.id));
    const result = {
      users,
      nextCursor: snapshot.docs.length === 25 ? snapshot.docs[snapshot.docs.length - 1] : null,
    };
    if (!cursor) {
      adminUsersCache = { ...result, expiresAt: Date.now() + ADMIN_USERS_CACHE_TTL_MS };
    }
    return result;
  });
  if (!cursor) adminUsersPending = readPage;
  try {
    const result = await readPage;
    return { users: filterAdminUsers(result.users, searchQuery), nextCursor: result.nextCursor };
  } finally {
    if (!cursor) adminUsersPending = null;
  }
}

function filterAdminUsers(users, query) {
  const normalized = query.trim().toLowerCase();
  return users
    .filter((user) => user.email?.toLowerCase() !== ADMIN_EMAIL)
    .filter((user) => !normalized || `${user.username} ${user.phone || ""} ${user.email || ""}`.toLowerCase().includes(normalized));
}

export function invalidateAdminUsersCache() {
  adminUsersCache = null;
}

export async function setPaymentVerification(userId, verified) {
  const updates = { paymentVerified: verified };
  if (verified) {
    const user = await readUser(userId);
    if (user.plan) {
      const verifiedAt = Date.now();
      const duration = (user.plan === "weekly" ? 7 : 30) * 24 * 60 * 60 * 1000;
      updates.subscribedAt = Timestamp.fromMillis(verifiedAt);
      updates.subscriptionExpiresAt = Timestamp.fromMillis(verifiedAt + duration);
    }
  }
  await updateDoc(doc(db, "users", userId), updates);
  invalidateAdminUsersCache();
  return { id: userId, paymentVerified: verified };
}

export async function deleteAdminUser(userId) {
  if (!userId || userId === auth.currentUser?.uid) {
    throw new Error("The administrator account cannot be deleted from this dashboard.");
  }

  const deleteUser = httpsCallable(functions, "deleteUserAccount");
  await deleteUser({ targetUid: userId });
}
