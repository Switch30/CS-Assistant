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

export type CustomerRecord = {
  id: string;
  ownerId: string;
  name: string;
  domisili: string;
  metodePembayaran: PaymentMethod;
  ongkir: number;
  diskonKirim: number;
  selisihKirim: number;
  adminTotal: number;
  ppnTotal: number;
  adminPpnTotal: number;
  packages: PackageResult[];
  createdAt: Date;
};

export type NewCustomerRecord = Omit<CustomerRecord, "id" | "ownerId" | "createdAt">;
