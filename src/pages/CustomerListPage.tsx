import { Loader2, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { formatDateOnly, formatDateTime } from "../lib/format";
import { listCustomers } from "../services/customers";
import type { CustomerRecord } from "../types";

const rowsPerPage = 8;

export function CustomerListPage() {
  const { account } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setCustomers(await listCustomers(account!.uid));
      } catch (loadError) {
        console.error(loadError);
        setError("Customer belum bisa dimuat.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomers();
  }, [account]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const matchesKeyword =
          !keyword ||
          customer.name.toLowerCase().includes(keyword) ||
          customer.domisili.toLowerCase().includes(keyword);
        const matchesDate = !dateFilter || formatDateOnly(customer.createdAt) === dateFilter;

        return matchesKeyword && matchesDate;
      })
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  }, [customers, dateFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const hasActiveFilter = Boolean(search || dateFilter);
  const paginatedCustomers = filteredCustomers.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  function resetPagination() {
    setCurrentPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("");
    resetPagination();
  }

  return (
    <>
      <PageHeader
        eyebrow="Database customer"
        title="Customer List"
        description="Cari dan lihat detail customer dari database."
      />

      <section className="panel">
        <div className="toolbar">
          <label className="search-field">
            Search
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPagination();
              }}
              placeholder="Search nama atau domisili"
            />
          </label>

          <label>
            Tanggal
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                resetPagination();
              }}
            />
          </label>

          {hasActiveFilter && (
            <button
              className="ghost-button compact filter-clear-button"
              type="button"
              onClick={clearFilters}
            >
              <RotateCcw size={18} />
              Reset Filter
            </button>
          )}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-meta">
          <span>{filteredCustomers.length} customer</span>
        </div>

        {isLoading && (
          <div className="empty-state">
            <Loader2 className="spin" size={22} />
            Memuat customer...
          </div>
        )}

        {!isLoading && error && <div className="empty-state error">{error}</div>}

        {!isLoading && !error && filteredCustomers.length === 0 && (
          <div className="empty-state">Belum ada customer yang cocok dengan filter.</div>
        )}

        {!isLoading && !error && filteredCustomers.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Customer</th>
                    <th>Domisili</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer, index) => (
                    <tr key={customer.id}>
                      <td data-label="No">{(safePage - 1) * rowsPerPage + index + 1}</td>
                      <td data-label="Nama Customer">
                        <a className="table-link" href={`/customers/${customer.id}`}>
                          {customer.name}
                        </a>
                      </td>
                      <td data-label="Domisili">{customer.domisili}</td>
                      <td data-label="Tanggal">{formatDateTime(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  className={page === safePage ? "active" : ""}
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
