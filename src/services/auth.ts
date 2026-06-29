import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const usernameDomain = "cs-assistant.local";

export type AuthAccount = {
  uid: string;
  username: string;
  isAdmin: boolean;
  isDeleted: boolean;
};

export const authReady = setPersistence(auth, browserLocalPersistence);

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${usernameDomain}`;
}

export function validateUsername(username: string) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username.trim());
}

async function getUsernameFromProfile(user: User) {
  const snapshot = await getDoc(doc(db, "users", user.uid));
  const data = snapshot.data();

  const username =
    typeof data?.username === "string" && data.username ? data.username : user.displayName || "";
  const usernameLower =
    typeof data?.usernameLower === "string" ? data.usernameLower : normalizeUsername(username);
  const isAdmin = data?.role === "admin" || usernameLower === "admin";
  const isDeleted = data?.status === "deleted";

  return { username, isAdmin, isDeleted };
}

async function ensureLoginProfile(user: User, username: string) {
  const cleanedUsername = normalizeUsername(username) === "admin" ? "admin" : username.trim() || user.displayName || "";
  const usernameLower = normalizeUsername(cleanedUsername);
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      username: cleanedUsername,
      usernameLower,
      role: usernameLower === "admin" ? "admin" : "user",
      status: "active",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
    return;
  }

  const updateData: Record<string, unknown> = {
    lastLoginAt: serverTimestamp()
  };

  if (usernameLower === "admin") {
    updateData.username = cleanedUsername;
    updateData.usernameLower = usernameLower;
    updateData.role = "admin";
    updateData.status = "active";
    updateData.updatedAt = serverTimestamp();
  }

  await updateDoc(userRef, updateData).catch(() => undefined);
}

export async function mapAuthUser(user: User): Promise<AuthAccount> {
  const profile = await getUsernameFromProfile(user);

  return {
    uid: user.uid,
    username: profile.username,
    isAdmin: profile.isAdmin,
    isDeleted: profile.isDeleted
  };
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithUsername(username: string, password: string) {
  await authReady;
  const credential = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  await ensureLoginProfile(credential.user, username);

  const account = await mapAuthUser(credential.user);

  if (account.isDeleted) {
    await signOut(auth);
    throw new Error("Akun ini sudah dinonaktifkan.");
  }

  return account;
}

export async function registerWithUsername(username: string, password: string) {
  await authReady;
  const cleanedUsername = username.trim();
  const credential = await createUserWithEmailAndPassword(
    auth,
    usernameToEmail(cleanedUsername),
    password
  );

  await updateProfile(credential.user, {
    displayName: cleanedUsername
  });

  await setDoc(doc(db, "users", credential.user.uid), {
    username: cleanedUsername,
    usernameLower: normalizeUsername(cleanedUsername),
    role: normalizeUsername(cleanedUsername) === "admin" ? "admin" : "user",
    status: "active",
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  });

  return mapAuthUser(credential.user);
}

export async function logout() {
  await signOut(auth);
}
