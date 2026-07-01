import { CheckCircle2, Copy, Eye, EyeOff, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { formatDateTime, formatRupiah } from "../lib/format";
import { buildDetailText, buildTemplateText } from "../lib/pricing";
import { deleteCustomer, getCustomer, updateCustomerIdentity } from "../services/customers";
import type { CustomerRecord, PaymentMethod } from "../types";

const paymentMethods: PaymentMethod[] = ["COD", "Transfer"];

function getCustomerIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] || "";
}

export function CustomerDetailPage() {
  const { account } = useAuth();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInternalDetail, setShowInternalDetail] = useState(false);
  const [showTemplateCustomer, setShowTemplateCustomer] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editName, setEditName] = useState("");
  const [editDomisili, setEditDomisili] = useState("");

  const internalDetailTexts = useMemo(() => {
    if (!customer) {
      return null;
    }

    return Object.fromEntries(
      paymentMethods.map((method) => [
        method,
        buildDetailText({
          metodePembayaran: method,
          customerName: customer.name,
          domisili: customer.domisili,
          ongkir: customer.ongkir,
          diskonKirim: customer.diskonKirim,
          packages: customer.calculations[method].packages
        })
      ])
    ) as Record<PaymentMethod, string>;
  }, [customer]);

  const templateCustomerTexts = useMemo(() => {
    if (!customer) {
      return null;
    }

    return Object.fromEntries(
      paymentMethods.map((method) => [method, buildTemplateText(customer.calculations[method].packages)])
    ) as Record<PaymentMethod, string>;
  }, [customer]);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const customerId = getCustomerIdFromPath();
        const nextCustomer = await getCustomer(customerId, account!.uid);
        setCustomer(nextCustomer);

        if (nextCustomer) {
          setEditName(nextCustomer.name);
          setEditDomisili(nextCustomer.domisili);
        }
      } catch (loadError) {
        console.error(loadError);
        setError("Detail customer belum bisa dimuat.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomer();
  }, [account]);

  function startEditing() {
    if (!customer) {
      return;
    }

    setEditName(customer.name);
    setEditDomisili(customer.domisili);
    setStatus("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!customer) {
      return;
    }

    setEditName(customer.name);
    setEditDomisili(customer.domisili);
    setStatus("");
    setIsEditing(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer) {
      return;
    }

    const nextName = editName.trim();
    const nextDomisili = editDomisili.trim();

    if (!nextName || !nextDomisili) {
      setStatus("Nama dan domisili wajib diisi.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      await updateCustomerIdentity(customer.id, {
        name: nextName,
        domisili: nextDomisili
      });

      setCustomer({
        ...customer,
        name: nextName,
        domisili: nextDomisili
      });
      setIsEditing(false);
      setStatus("Nama dan domisili berhasil diperbarui.");
    } catch (saveError) {
      console.error(saveError);
      setStatus("Data belum berhasil disimpan. Coba lagi sebentar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyInternalDetail(method: PaymentMethod) {
    if (!internalDetailTexts) {
      return;
    }

    await navigator.clipboard.writeText(internalDetailTexts[method]);
    setStatus(`Detail perhitungan ${method} berhasil disalin.`);
  }

  async function copyTemplateCustomer(method: PaymentMethod) {
    if (!templateCustomerTexts) {
      return;
    }

    await navigator.clipboard.writeText(templateCustomerTexts[method]);
    setStatus(`Template customer ${method} berhasil disalin.`);
  }

  async function handleDeleteCustomer() {
    if (!customer || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Hapus customer "${customer.name}"? Data yang sudah dihapus tidak bisa dikembalikan.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setStatus("");

    try {
      await deleteCustomer(customer.id);
      window.location.href = "/customers";
    } catch (deleteError) {
      console.error(deleteError);
      setStatus("Customer belum berhasil dihapus. Coba lagi sebentar.");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="empty-state page-loader">
        <Loader2 className="spin" size={24} />
        Memuat detail customer...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <>
        <PageHeader
          eyebrow="Customer detail"
          title="Customer Tidak Ditemukan"
          description={error || "Data customer tidak ada di Firestore."}
        />
      </>
    );
  }

  const comparisonRows = customer.calculations.COD.packages.map((codPackage) => {
    const transferPackage = customer.calculations.Transfer.packages.find(
      (item) => item.key === codPackage.key
    );

    return {
      key: codPackage.key,
      name: codPackage.nama,
      isi: codPackage.isi,
      codTotal: codPackage.totalFinal,
      transferTotal: transferPackage?.totalFinal ?? 0,
      difference: codPackage.totalFinal - (transferPackage?.totalFinal ?? 0)
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Customer detail"
        title={customer.name}
        description={`${customer.domisili} - ${formatDateTime(customer.createdAt)}`}
        action={
          <div className="header-actions customer-header-actions">
            {isEditing ? (
              <>
                <button
                  className="primary-button compact"
                  type="submit"
                  form="customerIdentityForm"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                  Save
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  <X size={18} />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => copyTemplateCustomer("COD")}
                  disabled={!templateCustomerTexts}
                >
                  <Copy size={18} />
                  Copy Template COD
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => copyTemplateCustomer("Transfer")}
                  disabled={!templateCustomerTexts}
                >
                  <Copy size={18} />
                  Copy Template Transfer
                </button>
                <button className="ghost-button compact" type="button" onClick={startEditing}>
                  <Pencil size={18} />
                  Edit
                </button>
                <button
                  className="danger-button compact"
                  type="button"
                  onClick={handleDeleteCustomer}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="spin" size={18} /> : <Trash2 size={18} />}
                  Delete
                </button>
              </>
            )}
          </div>
        }
      />

      {status && (
        <div className="status-banner detail-status">
          <CheckCircle2 size={18} />
          <span>{status}</span>
        </div>
      )}

      <form className="detail-grid" id="customerIdentityForm" onSubmit={handleSave}>
        <div className="panel detail-card">
          <span>Nama</span>
          {isEditing ? (
            <input
              className="inline-edit-input"
              required
              maxLength={120}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              aria-label="Nama customer"
            />
          ) : (
            <strong>{customer.name}</strong>
          )}
        </div>
        <div className="panel detail-card">
          <span>Domisili</span>
          {isEditing ? (
            <input
              className="inline-edit-input"
              required
              maxLength={120}
              value={editDomisili}
              onChange={(event) => setEditDomisili(event.target.value)}
              aria-label="Domisili customer"
            />
          ) : (
            <strong>{customer.domisili}</strong>
          )}
        </div>
        <div className="panel detail-card">
          <span>Ongkos Kirim</span>
          <strong>{formatRupiah(customer.ongkir)}</strong>
        </div>
        <div className="panel detail-card">
          <span>Diskon Kirim</span>
          <strong>{formatRupiah(customer.diskonKirim)}</strong>
        </div>
      </form>

      <section className="panel table-panel">
        <div className="section-title table-heading">
          <h2>Hasil Per Paket</h2>
          <p>Perbandingan harga final COD dan Transfer.</p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Paket</th>
                <th>COD</th>
                <th>Transfer</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((item) => (
                <tr key={item.key}>
                  <td data-label="Paket">
                    {item.name} ({item.isi} box)
                  </td>
                  <td data-label="COD">{formatRupiah(item.codTotal)}</td>
                  <td data-label="Transfer">{formatRupiah(item.transferTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel internal-detail-panel">
        <div className="internal-detail-header">
          <div className="section-title">
            <h2>Detail Perhitungan</h2>
            <p>Disembunyikan default supaya halaman tetap ringkas.</p>
          </div>
          <div
            className={`header-actions internal-detail-actions ${
              showInternalDetail ? "has-copy-action" : ""
            }`}
          >
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setShowInternalDetail((current) => !current)}
            >
              {showInternalDetail ? <EyeOff size={18} /> : <Eye size={18} />}
              {showInternalDetail ? "Hide Detail" : "Show Detail"}
            </button>
          </div>
        </div>

        {showInternalDetail && (
          <div className="internal-detail-content">
            <div className="result-method-grid">
              {paymentMethods.map((method) => (
                <div className="calculator-result-block" key={method}>
                  <div className="calculation-method-header">
                    <h3>{method}</h3>
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() => copyInternalDetail(method)}
                    >
                      <Copy size={18} />
                      Copy Detail
                    </button>
                  </div>
                  <textarea readOnly value={internalDetailTexts?.[method] ?? ""} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel internal-detail-panel">
        <div className="internal-detail-header">
          <div className="section-title">
            <h2>Template Pesan</h2>
            <p>Bisa diedit dulu sebelum dikirim.</p>
          </div>
          <div
            className={`header-actions internal-detail-actions ${
              showTemplateCustomer ? "has-copy-action" : ""
            }`}
          >
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setShowTemplateCustomer((current) => !current)}
            >
              {showTemplateCustomer ? <EyeOff size={18} /> : <Eye size={18} />}
              {showTemplateCustomer ? "Hide Template" : "Show Template"}
            </button>
          </div>
        </div>

        {showTemplateCustomer && (
          <div className="internal-detail-content template-method-list">
            {paymentMethods.map((method) => (
              <div className="template-method-block" key={method}>
                <div className="calculation-method-header">
                  <h3>{method}</h3>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => copyTemplateCustomer(method)}
                  >
                    <Copy size={18} />
                    Copy Template
                  </button>
                </div>
                <textarea
                  className="template-customer-textarea"
                  readOnly
                  value={templateCustomerTexts?.[method] ?? ""}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
