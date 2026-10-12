import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const CONTENT_KEYS = ["communication", "free_odds", "premium_odds"];
const COMMUNICATION_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ODDS_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const READ_CACHE_TTL_MS = 30 * 1000;

const cache = new Map();
const pendingReads = new Map();

function cachedRead(key, loader) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return Promise.resolve(entry.value);
  if (pendingReads.has(key)) return pendingReads.get(key);

  const pending = loader().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + READ_CACHE_TTL_MS });
    pendingReads.delete(key);
    return value;
  }).catch((error) => {
    pendingReads.delete(key);
    throw error;
  });
  pendingReads.set(key, pending);
  return pending;
}

function invalidateCache(...keys) {
  keys.forEach((key) => cache.delete(key));
}

function requireAdmin() {
  if (!auth.currentUser) throw new Error("Please sign in as an administrator.");
}

function iso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return value;
}

function mapContent(snapshot) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    ...data,
    updatedAt: iso(data.updatedAt),
    publishedUntil: iso(data.publishedUntil),
  };
}

export async function getCommunication() {
  return cachedRead("content:communication", async () =>
    mapContent(await getDoc(doc(db, "siteContent", "communication")))
  );
}

export async function getCommunications() {
  if (!auth.currentUser) throw new Error("Please sign in to view communication.");
  return cachedRead("communications", async () => {
    const now = Timestamp.now();
    const messagesQuery = query(
      collection(db, "communicationMessages"),
      where("expiresAt", ">", now),
      orderBy("expiresAt", "desc"),
      limit(25)
    );
    const [messagesSnapshot, legacyMessage] = await Promise.all([
      getDocs(messagesQuery),
      getCommunication(),
    ]);
    const messages = messagesSnapshot.docs.map((item) => {
      const data = item.data();
      const publishedAt = iso(data.publishedAt);
      return {
        id: item.id,
        title: data.title,
        message: data.message,
        publishedAt,
        updatedAt: publishedAt,
      };
    });

    if (legacyMessage?.title && legacyMessage.message) {
      const legacyTime = new Date(legacyMessage.updatedAt).getTime();
      const isRecent = Number.isFinite(legacyTime) && now.toMillis() - legacyTime < COMMUNICATION_RETENTION_MS;
      const alreadyListed = messages.some((item) => item.updatedAt === legacyMessage.updatedAt);
      if (isRecent && !alreadyListed) {
        messages.push({
          ...legacyMessage,
          id: "legacy-communication",
          publishedAt: legacyMessage.updatedAt,
        });
      }
    }

    return messages.sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt));
  });
}

export async function getCommunicationStatus() {
  if (!auth.currentUser) throw new Error("Please sign in to view communication.");
  const [latestCommunication, userSnapshot] = await Promise.all([
    getCommunication(),
    cachedRead(`user:${auth.currentUser.uid}`, () => getDoc(doc(db, "users", auth.currentUser.uid))),
  ]);
  const communication = latestCommunication?.title && latestCommunication?.message
    ? {
        ...latestCommunication,
        id: "legacy-communication",
        publishedAt: latestCommunication.updatedAt,
      }
    : null;
  const communicationReadAt = userSnapshot.exists()
    ? userSnapshot.data().communicationReadAt
    : null;
  return {
    communication,
    isUnread: Boolean(communication && communicationReadAt !== communication.updatedAt),
  };
}

export async function markCommunicationRead(updatedAt) {
  if (!auth.currentUser) throw new Error("Please sign in to update communication read state.");
  await updateDoc(doc(db, "users", auth.currentUser.uid), { communicationReadAt: updatedAt });
  invalidateCache(`user:${auth.currentUser.uid}`);
}

export async function getAdminContent() {
  requireAdmin();
  return cachedRead("admin-content", async () => {
    const entries = await Promise.all(CONTENT_KEYS.map(async (key) => [
      key,
      mapContent(await getDoc(doc(db, "siteContent", key))),
    ]));
    return Object.fromEntries(entries);
  });
}

export async function saveCommunication({ title, message }) {
  requireAdmin();
  const publishedAt = new Date();
  const expiresAt = new Date(publishedAt.getTime() + COMMUNICATION_RETENTION_MS);
  const value = { title: title.trim(), message: message.trim(), updatedAt: publishedAt.toISOString() };
  await addDoc(collection(db, "communicationMessages"), {
    title: value.title,
    message: value.message,
    publishedAt: Timestamp.fromDate(publishedAt),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  await setDoc(doc(db, "siteContent", "communication"), value, { merge: true });
  invalidateCache("content:communication", "communications", "admin-content");
  return value;
}

async function getOdds(key) {
  if (!auth.currentUser) throw new Error("Please sign in to view odds.");
  const userId = auth.currentUser.uid;
  const [postsSnapshot, userSnapshot] = await Promise.all([
    cachedRead(`odds:${key}`, () => getDocs(query(
      collection(db, "oddsPosts"),
      where("contentKey", "==", key),
      where("publishedAt", ">", Timestamp.fromMillis(Date.now() - ODDS_RETENTION_MS)),
      limit(25)
    ))),
    cachedRead(`user:${userId}`, () => getDoc(doc(db, "users", userId))),
  ]);
  const readPosts = new Set(userSnapshot.data()?.[key === "free_odds" ? "readFreeOdds" : "readPremiumOdds"] || []);
  const posts = postsSnapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      title: data.title,
      content: data.content,
      publishedAt: iso(data.publishedAt),
      isRead: readPosts.has(item.id),
    };
  });
  posts.sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt));
  return { posts };
}

async function saveOdds(key, { title, content }) {
  requireAdmin();
  const publishedAt = serverTimestamp();
  await addDoc(collection(db, "oddsPosts"), {
    contentKey: key,
    title: title.trim(),
    content: content.trim(),
    publishedAt,
  });
  await setDoc(doc(db, "siteContent", key), {
    title: title.trim(),
    content: content.trim(),
    updatedAt: serverTimestamp(),
    publishedUntil: new Date(Date.now() + ODDS_RETENTION_MS).toISOString(),
    draft: deleteField(),
  }, { merge: true });
  invalidateCache(`odds:${key}`, "admin-content");
  return { title: title.trim(), content: content.trim(), updatedAt: new Date().toISOString() };
}

export async function getFreeOdds() {
  return getOdds("free_odds");
}

export async function saveFreeOdds(odds) {
  return saveOdds("free_odds", odds);
}

export async function getPremiumOdds() {
  return getOdds("premium_odds");
}

export async function markOddsRead(key, postId, isRead) {
  if (!auth.currentUser) throw new Error("Please sign in to update read state.");
  const field = key === "free_odds" ? "readFreeOdds" : "readPremiumOdds";
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    [field]: isRead ? arrayUnion(postId) : arrayRemove(postId),
  });
  invalidateCache(`user:${auth.currentUser.uid}`);
  const oddsCache = cache.get(`odds:${key}`);
  if (oddsCache) {
    oddsCache.value.posts = oddsCache.value.posts.map((post) =>
      post.id === postId ? { ...post, isRead } : post
    );
  }
  return { isRead };
}

export async function savePremiumOdds(odds) {
  return saveOdds("premium_odds", odds);
}

export async function saveContentDraft(key, value) {
  requireAdmin();
  await setDoc(doc(db, "siteContent", key), { draft: value }, { merge: true });
  invalidateCache("admin-content");
}
