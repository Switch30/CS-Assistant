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
import { calculatePackages } from "../lib/pricing";
import type {
  CustomerCalculation,
  CustomerCalculations,
  CustomerRecord,
  NewCustomerRecord,
  PackageResult,
  PaymentMethod
} from "../types";

type LegacyCustomerDocument = {
  metodePembayaran?: PaymentMethod;
  adminTotal?: number;
  ppnTotal?: number;
  adminPpnTotal?: number;
  packages?: PackageResult[];
};

type CustomerDocument = Omit<CustomerRecord, "id" | "createdAt"> & LegacyCustomerDocument & {
  createdAt?: Timestamp;
};

const customersCollection = collection(db, "customers");
const paymentMethods: PaymentMethod[] = ["COD", "Transfer"];

function normalizeDate(value?: Timestamp) {
  return value?.toDate() ?? new Date();
}

function normalizePackages(packages: unknown): PackageResult[] {
  return Array.isArray(packages) ? packages as PackageResult[] : [];
}

function summarizeCalculation(metodePembayaran: PaymentMethod, packages: PackageResult[]): CustomerCalculation {
  const adminTotal = packages.reduce((total, item) => total + item.adminFinal, 0);
  const ppnTotal = packages.reduce((total, item) => total + item.ppnFinal, 0);

  return {
    metodePembayaran,
    adminTotal,
    ppnTotal,
    adminPpnTotal: adminTotal + ppnTotal,
    packages
  };
}

function isCalculation(value: unknown): value is CustomerCalculation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const calculation = value as Partial<CustomerCalculation>;

  return (
    (calculation.metodePembayaran === "COD" || calculation.metodePembayaran === "Transfer") &&
    typeof calculation.adminTotal === "number" &&
    typeof calculation.ppnTotal === "number" &&
    typeof calculation.adminPpnTotal === "number" &&
    Array.isArray(calculation.packages)
  );
}

function normalizeCalculations(data: CustomerDocument): CustomerCalculations {
  const calculationData = data.calculations as Partial<Record<PaymentMethod, unknown>> | undefined;
  const generatedCalculations = Object.fromEntries(
    paymentMethods.map((method) => {
      return [method, summarizeCalculation(method, calculatePackages(method, data.ongkir, data.diskonKirim))];
    })
  ) as CustomerCalculations;

  if (calculationData) {
    paymentMethods.forEach((method) => {
      const calculation = calculationData[method];

      if (isCalculation(calculation)) {
        generatedCalculations[method] = {
          ...calculation,
          packages: normalizePackages(calculation.packages)
        };
      }
    });

    return generatedCalculations;
  }

  if (data.metodePembayaran === "COD" || data.metodePembayaran === "Transfer") {
    generatedCalculations[data.metodePembayaran] = summarizeCalculation(
      data.metodePembayaran,
      normalizePackages(data.packages)
    );
  }

  return generatedCalculations;
}

function mapCustomer(id: string, data: CustomerDocument): CustomerRecord {
  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    domisili: data.domisili,
    ongkir: data.ongkir,
    diskonKirim: data.diskonKirim,
    selisihKirim: data.selisihKirim,
    calculations: normalizeCalculations(data),
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
