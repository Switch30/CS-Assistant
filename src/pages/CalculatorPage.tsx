import { CheckCircle2, Copy, Loader2, RotateCcw, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { cleanNumber, formatNumberInput, formatRupiah } from "../lib/format";
import { buildDetailText, buildTemplateText, calculatePackages } from "../lib/pricing";
import { createCustomer } from "../services/customers";
import type { PaymentMethod } from "../types";

export function CalculatorPage() {
  const { account } = useAuth();
  const [metodePembayaran, setMetodePembayaran] = useState<PaymentMethod>("COD");
  const [customerName, setCustomerName] = useState("");
  const [domisili, setDomisili] = useState("");
  const [ongkirInput, setOngkirInput] = useState("");
  const [diskonInput, setDiskonInput] = useState("");
  const [savedCustomerId, setSavedCustomerId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [detailText, setDetailText] = useState("");
  const [templateText, setTemplateText] = useState("");

  const ongkir = cleanNumber(ongkirInput);
  const diskonKirim = cleanNumber(diskonInput);
  const packages = useMemo(
    () => calculatePackages(metodePembayaran, ongkir, diskonKirim),
    [metodePembayaran, ongkir, diskonKirim]
  );
  const adminTotal = packages.reduce((total, item) => total + item.adminFinal, 0);
  const ppnTotal = packages.reduce((total, item) => total + item.ppnFinal, 0);
  const hasResult = detailText.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setSavedCustomerId("");

    const nextDetailText = buildDetailText({
      metodePembayaran,
      customerName,
      domisili,
      ongkir,
      diskonKirim,
      packages
    });
    const nextTemplateText = buildTemplateText(packages);

    try {
      const customerId = await createCustomer(
        {
          name: customerName,
          domisili,
          metodePembayaran,
          ongkir,
          diskonKirim,
          selisihKirim: ongkir - diskonKirim,
          adminTotal,
          ppnTotal,
          adminPpnTotal: adminTotal + ppnTotal,
          packages
        },
        account!.uid
      );

      setDetailText(nextDetailText);
      setTemplateText(nextTemplateText);
      setSavedCustomerId(customerId);
      setStatus("Data customer tersimpan.");
    } catch (error) {
      setDetailText(nextDetailText);
      setTemplateText(nextTemplateText);
      setStatus("Hitungan berhasil dibuat, tapi data belum tersimpan.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus("Text berhasil disalin.");
  }

  function resetForm() {
    setCustomerName("");
    setDomisili("");
    setOngkirInput("");
    setDiskonInput("");
    setSavedCustomerId("");
    setDetailText("");
    setTemplateText("");
    setStatus("");
  }

  return (
    <>
      <PageHeader
        eyebrow="Customer service tool"
        title="Kalkulator Harga"
        description="Hitung harga paket dan generate template pesan yang sudah siap pakai."
      />

      <section className="dashboard-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="section-title">
            <h2>Input Order</h2>
          </div>

          <div className="segmented-control">
            {(["COD", "Transfer"] as PaymentMethod[]).map((method) => (
              <button
                className={metodePembayaran === method ? "active" : ""}
                key={method}
                type="button"
                onClick={() => setMetodePembayaran(method)}
              >
                {method}
              </button>
            ))}
          </div>

          <label>
            Nama Customer
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Contoh: Ferren"
            />
          </label>

          <label>
            Domisili
            <input
              required
              value={domisili}
              onChange={(event) => setDomisili(event.target.value)}
              placeholder="Contoh: Jakarta"
            />
          </label>

          <div className="two-column">
            <label>
              Ongkos Kirim
              <input
                required
                inputMode="numeric"
                value={ongkirInput}
                onChange={(event) => setOngkirInput(formatNumberInput(event.target.value))}
                placeholder="30.000"
              />
            </label>

            <label>
              Diskon Kirim
              <input
                required
                inputMode="numeric"
                value={diskonInput}
                onChange={(event) => setDiskonInput(formatNumberInput(event.target.value))}
                placeholder="5.000"
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Simpan & Hitung
            </button>
            <button className="ghost-button" type="button" onClick={resetForm}>
              <RotateCcw size={18} />
              Reset
            </button>
          </div>

          {status && (
            <div className="status-banner">
              <CheckCircle2 size={18} />
              <span>{status}</span>
            </div>
          )}
        </form>

        <aside className="panel summary-panel">
          <div className="section-title">
            <h2>Ringkasan Live</h2>
            <p>Preview harga otomatis mengikuti input.</p>
          </div>

          <div className="package-list">
            {packages.map((item) => (
              <div className="package-card" key={item.key}>
                <div>
                  <span>{item.isi} box</span>
                  <strong>{item.nama}</strong>
                </div>
                <b>{formatRupiah(item.totalFinal)}</b>
              </div>
            ))}
          </div>

          {savedCustomerId && (
            <a className="detail-link" href={`/customers/${savedCustomerId}`}>
              Lihat detail customer
            </a>
          )}
        </aside>
      </section>

      {hasResult && (
        <section className="result-grid">
          <div className="panel">
            <div className="result-header">
              <div className="section-title">
                <h2>Detail Perhitungan</h2>
                <p>Readonly untuk cek rumus dan nominal.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => copyText(detailText)} aria-label="Copy detail">
                <Copy size={18} />
              </button>
            </div>
            <textarea readOnly value={detailText} />
          </div>

          <div className="panel">
            <div className="result-header">
              <div className="section-title">
                <h2>Template Pesan</h2>
                <p>Bisa diedit dulu sebelum dikirim.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => copyText(templateText)} aria-label="Copy template">
                <Copy size={18} />
              </button>
            </div>
            <textarea value={templateText} onChange={(event) => setTemplateText(event.target.value)} />
          </div>
        </section>
      )}
    </>
  );
}
