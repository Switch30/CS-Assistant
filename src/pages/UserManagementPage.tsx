import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../lib/format";
import { listManagedUsers, softDeleteManagedUser, type ManagedUser } from "../services/adminUsers";

function formatLastLogin(value: string | null) {
  return value ? formatDateTime(new Date(value)) : "Belum pernah";
}

export function UserManagementPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [error, setError] = useState("");
  const isAdmin = Boolean(account?.isAdmin);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      setError("");

      try {
        setUsers(await listManagedUsers());
      } catch (loadError) {
        console.error(loadError);
        setError("User management hanya bisa dibuka oleh admin.");
      } finally {
        setIsLoading(false);
      }
    }

    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <PageHeader
        eyebrow="Admin tool"
        title="Akses Ditolak"
        description="User management hanya bisa dibuka oleh admin."
      />
    );
  }

  async function handleDeleteUser(user: ManagedUser) {
    if (user.uid === account?.uid) {
      setError("Admin tidak bisa menghapus akun yang sedang dipakai.");
      return;
    }

    if (user.role === "admin") {
      setError("Akun admin tidak bisa dihapus dari halaman ini.");
      return;
    }

    const confirmed = window.confirm(
      `Nonaktifkan user "${user.username}"? User ini tidak bisa mengakses app lagi.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.uid);
    setError("");

    try {
      await softDeleteManagedUser(user.uid);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.uid !== user.uid));
    } catch (deleteError) {
      console.error(deleteError);
      setError("User gagal dinonaktifkan. Pastikan akun admin punya akses.");
    } finally {
      setDeletingUserId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin tool"
        title="User Management"
        description="Lihat akun CS yang aktif dan nonaktifkan user yang sudah tidak dipakai."
      />

      <section className="panel table-panel">
        <div className="table-meta">
          <span>{users.length} user</span>
          <span>Admin only</span>
        </div>

        {isLoading && (
          <div className="empty-state">
            <Loader2 className="spin" size={22} />
            Memuat user...
          </div>
        )}

        {!isLoading && error && <div className="empty-state error">{error}</div>}

        {!isLoading && !error && users.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Username</th>
                  <th>Last Login</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.uid}>
                    <td data-label="No">{index + 1}</td>
                    <td className="table-strong" data-label="Username">
                      {user.username}
                    </td>
                    <td data-label="Last Login">{formatLastLogin(user.lastLoginAt)}</td>
                    <td data-label="Aksi">
                      <button
                        className="danger-button compact table-action-button"
                        type="button"
                        disabled={
                          deletingUserId === user.uid ||
                          user.uid === account?.uid ||
                          user.role === "admin"
                        }
                        onClick={() => handleDeleteUser(user)}
                      >
                        {deletingUserId === user.uid ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && users.length === 0 && (
          <div className="empty-state">Belum ada user aktif.</div>
        )}
      </section>
    </>
  );
}
