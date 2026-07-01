import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { cleanNumber, formatNumberInput, formatRupiah } from "../lib/format";
import { buildDetailText, buildTemplateText, calculatePackages } from "../lib/pricing";
import { createCustomer } from "../services/customers";
import type { CustomerCalculation, CustomerCalculations, PaymentMethod } from "../types";

const paymentMethods: PaymentMethod[] = ["COD", "Transfer"];
const emptyMethodText: Record<PaymentMethod, string> = {
  COD: "",
  Transfer: ""
};

function summarizeCalculation(
  metodePembayaran: PaymentMethod,
  ongkir: number,
  diskonKirim: number
): CustomerCalculation {
  const packages = calculatePackages(metodePembayaran, ongkir, diskonKirim);
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

export function CalculatorPage() {
  const { account } = useAuth();
  const resultRef = useRef<HTMLElement | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [domisili, setDomisili] = useState("");
  const [ongkirInput, setOngkirInput] = useState("");
  const [diskonInput, setDiskonInput] = useState("");
  const [savedCustomerId, setSavedCustomerId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [showCalculationDetail, setShowCalculationDetail] = useState(false);
  const [showTemplateResult, setShowTemplateResult] = useState(false);
  const [detailTexts, setDetailTexts] = useState<Record<PaymentMethod, string>>(emptyMethodText);
  const [templateTexts, setTemplateTexts] = useState<Record<PaymentMethod, string>>(emptyMethodText);

  const ongkir = cleanNumber(ongkirInput);
  const diskonKirim = cleanNumber(diskonInput);
  const calculations = useMemo(() => {
    return Object.fromEntries(
      paymentMethods.map((method) => [method, summarizeCalculation(method, ongkir, diskonKirim)])
    ) as CustomerCalculations;
  }, [diskonKirim, ongkir]);
  const comparisonRows = calculations.COD.packages.map((codPackage) => {
    const transferPackage = calculations.Transfer.packages.find((item) => item.key === codPackage.key);

    return {
      key: codPackage.key,
      label: `${codPackage.isi} box`,
      name: codPackage.nama,
      codTotal: codPackage.totalFinal,
      transferTotal: transferPackage?.totalFinal ?? 0,
      difference: codPackage.totalFinal - (transferPackage?.totalFinal ?? 0)
    };
  });
  const hasResult = paymentMethods.some((method) => detailTexts[method].length > 0);

  function showStatus(message: string, tone: "success" | "error" = "success") {
    setStatus(message);
    setStatusTone(tone);
  }

  function scrollToResults() {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (diskonKirim > ongkir) {
      showStatus("Diskon kirim tidak boleh lebih besar dari ongkos kirim.", "error");
      return;
    }

    setIsSaving(true);
    setStatus("");
    setSavedCustomerId("");
    setShowCalculationDetail(false);
    setShowTemplateResult(false);

    const nextDetailTexts = Object.fromEntries(
      paymentMethods.map((method) => [
        method,
        buildDetailText({
          metodePembayaran: method,
          customerName,
          domisili,
          ongkir,
          diskonKirim,
          packages: calculations[method].packages
        })
      ])
    ) as Record<PaymentMethod, string>;
    const nextTemplateTexts = Object.fromEntries(
      paymentMethods.map((method) => [method, buildTemplateText(calculations[method].packages)])
    ) as Record<PaymentMethod, string>;

    try {
      const customerId = await createCustomer(
        {
          name: customerName,
          domisili,
          ongkir,
          diskonKirim,
          selisihKirim: ongkir - diskonKirim,
          calculations
        },
        account!.uid
      );

      setDetailTexts(nextDetailTexts);
      setTemplateTexts(nextTemplateTexts);
      setSavedCustomerId(customerId);
      showStatus("Data customer tersimpan.");
      scrollToResults();
    } catch (error) {
      setDetailTexts(nextDetailTexts);
      setTemplateTexts(nextTemplateTexts);
      showStatus("Hitungan berhasil dibuat, tapi data belum tersimpan.", "error");
      scrollToResults();
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    showStatus("Text berhasil disalin.");
  }

  function resetForm() {
    setCustomerName("");
    setDomisili("");
    setOngkirInput("");
    setDiskonInput("");
    setSavedCustomerId("");
    setShowCalculationDetail(false);
    setShowTemplateResult(false);
    setDetailTexts(emptyMethodText);
    setTemplateTexts(emptyMethodText);
    setStatus("");
    setStatusTone("success");
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
            <div className={`status-banner ${statusTone === "error" ? "error" : ""}`}>
              {statusTone === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{status}</span>
            </div>
          )}

          {hasResult && (
            <div className="quick-actions" aria-label="Aksi cepat hasil hitungan">
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => copyText(templateTexts.COD)}
              >
                <Copy size={18} />
                Copy Template COD
              </button>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => copyText(templateTexts.Transfer)}
              >
                <Copy size={18} />
                Copy Template Transfer
              </button>
              {savedCustomerId && (
                <a className="primary-button compact" href={`/customers/${savedCustomerId}`}>
                  Lihat Detail
                </a>
              )}
            </div>
          )}
        </form>

        <aside className="panel summary-panel">
          <div className="section-title">
            <h2>Ringkasan Live</h2>
            <p>Bandingkan harga jadi per metode.</p>
          </div>

          <div className="comparison-list">
            <div className="comparison-header">
              <span>Paket</span>
              <span>COD</span>
              <span>Transfer</span>
            </div>
            {comparisonRows.map((item) => (
              <div className="comparison-row" key={item.key}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.name}</strong>
                </div>
                <b>{formatRupiah(item.codTotal)}</b>
                <b>{formatRupiah(item.transferTotal)}</b>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {hasResult && (
        <section className="result-stack" ref={resultRef}>
          <div className="panel internal-detail-panel">
            <div className="internal-detail-header">
              <div className="section-title">
                <h2>Detail Perhitungan</h2>
                <p>Disembunyikan default supaya hasil hitung tetap ringkas.</p>
              </div>
              <div
                className={`header-actions internal-detail-actions ${
                  showCalculationDetail ? "has-copy-action" : ""
                }`}
              >
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => setShowCalculationDetail((current) => !current)}
                >
                  {showCalculationDetail ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showCalculationDetail ? "Hide Detail" : "Show Detail"}
                </button>
              </div>
            </div>

            {showCalculationDetail && (
              <div className="internal-detail-content">
                <div className="result-method-grid">
                  {paymentMethods.map((method) => (
                    <div className="calculator-result-block" key={method}>
                      <div className="calculation-method-header">
                        <h3>{method}</h3>
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => copyText(detailTexts[method])}
                        >
                          <Copy size={18} />
                          Copy Detail
                        </button>
                      </div>
                      <textarea readOnly value={detailTexts[method]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel internal-detail-panel">
            <div className="internal-detail-header">
              <div className="section-title">
                <h2>Template Pesan</h2>
                <p>Bisa diedit dulu sebelum dikirim.</p>
              </div>
              <div
                className={`header-actions internal-detail-actions ${
                  showTemplateResult ? "has-copy-action" : ""
                }`}
              >
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => setShowTemplateResult((current) => !current)}
                >
                  {showTemplateResult ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showTemplateResult ? "Hide Template" : "Show Template"}
                </button>
              </div>
            </div>

            {showTemplateResult && (
              <div className="internal-detail-content template-method-list">
                {paymentMethods.map((method) => (
                  <div className="template-method-block" key={method}>
                    <div className="calculation-method-header">
                      <h3>{method}</h3>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => copyText(templateTexts[method])}
                      >
                        <Copy size={18} />
                        Copy Template
                      </button>
                    </div>
                    <textarea
                      className="template-customer-textarea"
                      value={templateTexts[method]}
                      onChange={(event) =>
                        setTemplateTexts((current) => ({
                          ...current,
                          [method]: event.target.value
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
