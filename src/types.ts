export type PaymentMethod = "COD" | "Transfer";

export type PackageResult = {
  key: string;
  emoji: string;
  nama: string;
  isi: number;
  hargaDasar: number;
  potongan: number;
  adminFinal: number;
  ppnFinal: number;
  totalAwal: number;
  totalFinal: number;
  hargaCoret: number;
};

export type CustomerCalculation = {
  metodePembayaran: PaymentMethod;
  adminTotal: number;
  ppnTotal: number;
  adminPpnTotal: number;
  packages: PackageResult[];
};

export type CustomerCalculations = Record<PaymentMethod, CustomerCalculation>;

export type CustomerRecord = {
  id: string;
  ownerId: string;
  name: string;
  domisili: string;
  ongkir: number;
  diskonKirim: number;
  selisihKirim: number;
  calculations: CustomerCalculations;
  createdAt: Date;
};

export type NewCustomerRecord = Omit<CustomerRecord, "id" | "ownerId" | "createdAt">;
