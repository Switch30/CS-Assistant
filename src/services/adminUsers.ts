import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type ManagedUser = {
  uid: string;
  username: string;
  role: "admin" | "user";
  lastLoginAt: string | null;
  status: "active" | "deleted";
};

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
}

export async function listManagedUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .map((userDoc): ManagedUser => {
      const data = userDoc.data();
      const username =
        typeof data.username === "string" && data.username ? data.username : "Tanpa username";
      const usernameLower =
        typeof data.usernameLower === "string" ? data.usernameLower : username.toLowerCase();
      const role = data.role === "admin" || usernameLower === "admin" ? "admin" : "user";
      const status = data.status === "deleted" ? "deleted" : "active";

      return {
        uid: userDoc.id,
        username,
        role,
        status,
        lastLoginAt: timestampToIso(data.lastLoginAt)
      };
    })
    .filter((user) => user.status !== "deleted")
    .sort((firstUser, secondUser) => firstUser.username.localeCompare(secondUser.username));
}

export async function softDeleteManagedUser(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    status: "deleted",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
