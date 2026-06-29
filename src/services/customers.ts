import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { CustomerRecord, NewCustomerRecord, PackageResult } from "../types";

type CustomerDocument = Omit<CustomerRecord, "id" | "createdAt"> & {
  createdAt?: Timestamp;
};

const customersCollection = collection(db, "customers");

function normalizeDate(value?: Timestamp) {
  return value?.toDate() ?? new Date();
}

function normalizePackages(packages: unknown): PackageResult[] {
  return Array.isArray(packages) ? packages as PackageResult[] : [];
}

function mapCustomer(id: string, data: CustomerDocument): CustomerRecord {
  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    domisili: data.domisili,
    metodePembayaran: data.metodePembayaran,
    ongkir: data.ongkir,
    diskonKirim: data.diskonKirim,
    selisihKirim: data.selisihKirim,
    adminTotal: data.adminTotal,
    ppnTotal: data.ppnTotal,
    adminPpnTotal: data.adminPpnTotal,
    packages: normalizePackages(data.packages),
    createdAt: normalizeDate(data.createdAt)
  };
}

export async function createCustomer(customer: NewCustomerRecord, ownerId: string) {
  const documentRef = await addDoc(customersCollection, {
    ...customer,
    ownerId,
    createdAt: serverTimestamp()
  });

  return documentRef.id;
}

export async function listCustomers(ownerId: string) {
  const snapshot = await getDocs(
    query(customersCollection, where("ownerId", "==", ownerId), orderBy("createdAt", "desc"))
  );

  return snapshot.docs.map((document) => {
    return mapCustomer(document.id, document.data() as CustomerDocument);
  });
}

export async function getCustomer(customerId: string, ownerId: string) {
  const snapshot = await getDoc(doc(db, "customers", customerId));

  if (!snapshot.exists()) {
    return null;
  }

  const customer = mapCustomer(snapshot.id, snapshot.data() as CustomerDocument);

  return customer.ownerId === ownerId ? customer : null;
}

export async function updateCustomerIdentity(
  customerId: string,
  data: Pick<CustomerRecord, "name" | "domisili">
) {
  await updateDoc(doc(db, "customers", customerId), data);
}

export async function deleteCustomer(customerId: string) {
  await deleteDoc(doc(db, "customers", customerId));
}
