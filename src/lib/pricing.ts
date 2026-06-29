import type { PaymentMethod, PackageResult } from "../types";
import { formatRupiah, formatTanpaRp } from "./format";

type PackageConfig = {
  key: string;
  emoji: string;
  nama: string;
  isi: number;
  hargaDasar: number;
  potonganCOD: number;
  potonganTransfer: number;
  adminPpnCOD: boolean;
  adminPpnTransfer: boolean;
  labelTambahan: string;
};

export const packageList: PackageConfig[] = [
  {
    key: "paket1",
    emoji: "🎁",
    nama: "Paket Coba Dulu",
    isi: 1,
    hargaDasar: 85000,
    potonganCOD: 5000,
    potonganTransfer: 5000,
    adminPpnCOD: true,
    adminPpnTransfer: true,
    labelTambahan: ""
  },
  {
    key: "paket2",
    emoji: "⭐",
    nama: "Paket Kuat",
    isi: 2,
    hargaDasar: 170000,
    potonganCOD: 10000,
    potonganTransfer: 0,
    adminPpnCOD: true,
    adminPpnTransfer: false,
    labelTambahan: "Best Seller"
  },
  {
    key: "paket3",
    emoji: "🏆",
    nama: "Paket Jagoan",
    isi: 3,
    hargaDasar: 246000,
    potonganCOD: 15000,
    potonganTransfer: 0,
    adminPpnCOD: true,
    adminPpnTransfer: false,
    labelTambahan: "Rekomendasi"
  }
];

function roundUpToThousand(number: number) {
  return Math.ceil(number / 1000) * 1000;
}

function getPotonganByMetode(paket: PackageConfig, metodePembayaran: PaymentMethod) {
  return metodePembayaran === "COD" ? paket.potonganCOD : paket.potonganTransfer;
}

function getStatusAdminPpnByMetode(paket: PackageConfig, metodePembayaran: PaymentMethod) {
  return metodePembayaran === "COD" ? paket.adminPpnCOD : paket.adminPpnTransfer;
}

function getTemplateEmoji(emoji: string) {
  const emojiMap: Record<string, string> = {
    Gift: "🎁",
    Star: "⭐",
    Trophy: "🏆"
  };

  return emojiMap[emoji] ?? emoji;
}

export function calculatePackages(
  metodePembayaran: PaymentMethod,
  ongkir: number,
  diskonKirim: number
): PackageResult[] {
  const selisihKirim = ongkir - diskonKirim;

  return packageList.map((paket) => {
    const potongan = getPotonganByMetode(paket, metodePembayaran);
    const pakaiAdminPpn = getStatusAdminPpnByMetode(paket, metodePembayaran);
    const totalAwal = paket.hargaDasar + selisihKirim - potongan;
    const biayaAdmin = pakaiAdminPpn ? totalAwal * 0.03 : 0;
    const adminFinal = pakaiAdminPpn ? roundUpToThousand(biayaAdmin) : 0;
    const biayaPpn = pakaiAdminPpn ? biayaAdmin * 0.11 : 0;
    const ppnFinal = pakaiAdminPpn ? roundUpToThousand(biayaPpn) : 0;
    const totalFinal = totalAwal + adminFinal + ppnFinal;
    const hargaCoret = paket.hargaDasar + ongkir + adminFinal + ppnFinal;

    return {
      key: paket.key,
      emoji: paket.emoji,
      nama: paket.nama,
      isi: paket.isi,
      hargaDasar: paket.hargaDasar,
      potongan,
      adminFinal,
      ppnFinal,
      totalAwal,
      totalFinal,
      hargaCoret
    };
  });
}

export function buildDetailText(params: {
  metodePembayaran: PaymentMethod;
  customerName: string;
  domisili: string;
  ongkir: number;
  diskonKirim: number;
  packages: PackageResult[];
}) {
  const selisihKirim = params.ongkir - params.diskonKirim;
  const detailPaketText = params.packages.map((paket) => {
    const statusAdmin = paket.adminFinal > 0 || paket.ppnFinal > 0 ? "YA" : "TIDAK";
    const statusPotongan = paket.potongan > 0 ? formatRupiah(paket.potongan) : "Tidak ada potongan";

    return `${paket.nama} - ${paket.isi} box Ettagrow
--------------------------------
Harga dasar              : ${formatRupiah(paket.hargaDasar)}
Ongkir Akhir             : ${formatRupiah(selisihKirim)}
Potongan paket           : ${statusPotongan}

Rumus total awal:
${formatRupiah(paket.hargaDasar)} + ${formatRupiah(selisihKirim)} - ${formatRupiah(paket.potongan)}
= ${formatRupiah(paket.totalAwal)}

Admin + PPN              : ${statusAdmin}
Admin dibulatkan         : ${formatRupiah(paket.adminFinal)}
PPN dibulatkan           : ${formatRupiah(paket.ppnFinal)}

Rumus total final:
${formatRupiah(paket.totalAwal)} + ${formatRupiah(paket.adminFinal)} + ${formatRupiah(paket.ppnFinal)}
= ${formatRupiah(paket.totalFinal)}

Harga coret              : ${formatRupiah(paket.hargaCoret)}
Harga jadi               : ${formatRupiah(paket.totalFinal)}`;
  }).join("\n\n");

  return `DETAIL PERHITUNGAN
==============================

Metode pembayaran        : ${params.metodePembayaran}
Nama customer            : ${params.customerName}
Domisili                 : ${params.domisili}
Ongkos kirim             : ${formatRupiah(params.ongkir)}
Diskon kirim             : ${formatRupiah(params.diskonKirim)}
Ongkir Akhir             : ${formatRupiah(selisihKirim)}

==============================

${detailPaketText}`;
}

export function buildTemplateText(packages: PackageResult[]) {
  const templatePaketText = packages.map((paket) => {
    const suffix = paket.isi === 2 ? " Best Seller" : paket.isi === 3 ? " Rekomendasi" : "";
    const emoji = getTemplateEmoji(paket.emoji);

    if (paket.isi === 1) {
      return `${emoji} ${paket.nama} Isi : ${paket.isi} box Ettagrow
PROMO: ~${formatTanpaRp(paket.hargaCoret)}~ JADI ${formatTanpaRp(paket.totalFinal)}${suffix}`;
    }

    return `${emoji} ${paket.nama} Isi : ${paket.isi} box Ettagrow
PROMO : ~${formatRupiah(paket.hargaCoret)}~ JADI ${formatRupiah(paket.totalFinal)}${suffix}`;
  }).join("\n\n");

  return `PROMO PAYDAY ((TERBATAS)) - Disc Up to 30% untuk pemesanan HARI INI saja

${templatePaketText}`;
}
