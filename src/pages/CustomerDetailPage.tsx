import { CheckCircle2, Copy, Eye, EyeOff, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { formatDateTime, formatRupiah } from "../lib/format";
import { buildDetailText, buildTemplateText } from "../lib/pricing";
import { deleteCustomer, getCustomer, updateCustomerIdentity } from "../services/customers";
import type { CustomerRecord } from "../types";

function getCustomerIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] || "";
}

function InternalInfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="internal-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

  const internalDetailText = useMemo(() => {
    if (!customer) {
      return "";
    }

    return buildDetailText({
      metodePembayaran: customer.metodePembayaran,
      customerName: customer.name,
      domisili: customer.domisili,
      ongkir: customer.ongkir,
      diskonKirim: customer.diskonKirim,
      packages: customer.packages
    });
  }, [customer]);

  const templateCustomerText = useMemo(() => {
    if (!customer) {
      return "";
    }

    return buildTemplateText(customer.packages);
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

  async function copyInternalDetail() {
    await navigator.clipboard.writeText(internalDetailText);
    setStatus("Detail perhitungan berhasil disalin.");
  }

  async function copyTemplateCustomer() {
    await navigator.clipboard.writeText(templateCustomerText);
    setStatus("Template customer berhasil disalin.");
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

  const selisihKirim = customer.ongkir - customer.diskonKirim;

  return (
    <>
      <PageHeader
        eyebrow="Customer detail"
        title={customer.name}
        description={`${customer.domisili} - ${formatDateTime(customer.createdAt)}`}
        action={
          <div className="header-actions">
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
                <button className="primary-button compact" type="button" onClick={startEditing}>
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
          <p>Breakdown admin, PPN, dan harga final.</p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Paket</th>
                <th>Admin</th>
                <th>PPN</th>
                <th>Total Final</th>
              </tr>
            </thead>
            <tbody>
              {customer.packages.map((item) => (
                <tr key={item.key}>
                  <td data-label="Paket">
                    {item.nama} ({item.isi} box)
                  </td>
                  <td data-label="Admin">{formatRupiah(item.adminFinal)}</td>
                  <td data-label="PPN">{formatRupiah(item.ppnFinal)}</td>
                  <td data-label="Total Final">{formatRupiah(item.totalFinal)}</td>
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
          </div>
          <div
            className={`header-actions internal-detail-actions ${
              showInternalDetail ? "has-copy-action" : ""
            }`}
          >
            {showInternalDetail && (
              <button
                className="ghost-button compact"
                type="button"
                onClick={copyInternalDetail}
              >
                <Copy size={18} />
                Copy
              </button>
            )}
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
            <div className="internal-summary-grid" aria-label="Ringkasan detail perhitungan">
              <div className="internal-summary-card">
                <span>Metode Pembayaran</span>
                <strong>{customer.metodePembayaran}</strong>
              </div>
              <div className="internal-summary-card">
                <span>Ongkir Akhir</span>
                <strong>{formatRupiah(selisihKirim)}</strong>
              </div>
              <div className="internal-summary-card">
                <span>Admin + PPN Total</span>
                <strong>{formatRupiah(customer.adminPpnTotal)}</strong>
              </div>
              <div className="internal-summary-card">
                <span>Tanggal Entry</span>
                <strong>{formatDateTime(customer.createdAt)}</strong>
              </div>
            </div>

            <div className="internal-detail-block">
              <h3>Data Customer</h3>
              <div className="internal-detail-rows">
                <InternalInfoRow label="Nama customer" value={customer.name} />
                <InternalInfoRow label="Domisili" value={customer.domisili} />
                <InternalInfoRow label="Ongkos kirim" value={formatRupiah(customer.ongkir)} />
                <InternalInfoRow label="Diskon kirim" value={formatRupiah(customer.diskonKirim)} />
                <InternalInfoRow label="Ongkir Akhir" value={formatRupiah(selisihKirim)} />
              </div>
            </div>

            <div className="internal-package-list">
              {customer.packages.map((item) => {
                const hasAdminPpn = item.adminFinal > 0 || item.ppnFinal > 0;
                const potonganText =
                  item.potongan > 0 ? formatRupiah(item.potongan) : "Tidak ada potongan";

                return (
                  <article className="internal-package-card" key={item.key}>
                    <div className="internal-package-title">
                      <div>
                        <h3>{item.nama}</h3>
                        <p>{item.isi} box Ettagrow</p>
                      </div>
                      <strong>{formatRupiah(item.totalFinal)}</strong>
                    </div>

                    <div className="internal-detail-rows">
                      <InternalInfoRow label="Harga dasar" value={formatRupiah(item.hargaDasar)} />
                      <InternalInfoRow label="Ongkir Akhir" value={formatRupiah(selisihKirim)} />
                      <InternalInfoRow label="Potongan paket" value={potonganText} />
                      <InternalInfoRow label="Admin + PPN" value={hasAdminPpn ? "YA" : "TIDAK"} />
                      <InternalInfoRow
                        label="Admin dibulatkan"
                        value={formatRupiah(item.adminFinal)}
                      />
                      <InternalInfoRow label="PPN dibulatkan" value={formatRupiah(item.ppnFinal)} />
                      <InternalInfoRow label="Harga coret" value={formatRupiah(item.hargaCoret)} />
                    </div>

                    <div className="formula-grid">
                      <div className="formula-box">
                        <span>Rumus total awal</span>
                        <code>
                          {formatRupiah(item.hargaDasar)} + {formatRupiah(selisihKirim)} -{" "}
                          {formatRupiah(item.potongan)}
                        </code>
                        <strong>= {formatRupiah(item.totalAwal)}</strong>
                      </div>
                      <div className="formula-box">
                        <span>Rumus total final</span>
                        <code>
                          {formatRupiah(item.totalAwal)} + {formatRupiah(item.adminFinal)} +{" "}
                          {formatRupiah(item.ppnFinal)}
                        </code>
                        <strong>= {formatRupiah(item.totalFinal)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
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
            {showTemplateCustomer && (
              <button
                className="ghost-button compact"
                type="button"
                onClick={copyTemplateCustomer}
              >
                <Copy size={18} />
                Copy
              </button>
            )}
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
          <div className="internal-detail-content">
            <textarea
              className="template-customer-textarea"
              readOnly
              value={templateCustomerText}
            />
          </div>
        )}
      </section>
    </>
  );
}
