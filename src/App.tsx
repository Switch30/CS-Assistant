import { LayoutDashboard, LogOut, Table2, UserCircle, Users } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage").then((module) => ({ default: module.CustomerDetailPage })));
const CustomerListPage = lazy(() => import("./pages/CustomerListPage").then((module) => ({ default: module.CustomerListPage })));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage").then((module) => ({ default: module.UserManagementPage })));

type RouteName = "calculator" | "customers" | "customerDetail" | "users";

function getRoute(pathname: string): RouteName {
  if (pathname === "/users") {
    return "users";
  }

  if (pathname.startsWith("/customers/")) {
    return "customerDetail";
  }

  if (pathname === "/customers") {
    return "customers";
  }

  return "calculator";
}

export function App() {
  const route = useMemo(() => getRoute(window.location.pathname), []);
  const { account, isAuthLoading, signOut } = useAuth();

  if (isAuthLoading) {
    return <div className="empty-state page-loader">Memuat session...</div>;
  }

  if (!account) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CS</span>
          <div>
            <strong>CS Assistant</strong>
            <small>Price & customer ops</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigasi utama">
          <a className={route === "calculator" ? "active" : ""} href="/">
            <LayoutDashboard size={18} />
            Kalkulator
          </a>
          <a
            className={route === "customers" || route === "customerDetail" ? "active" : ""}
            href="/customers"
          >
            <Table2 size={18} />
            Customer List
          </a>
          {account.isAdmin && (
            <a className={route === "users" ? "active" : ""} href="/users">
              <Users size={18} />
              User Management
            </a>
          )}
        </nav>

        <div className="account-box">
          <div>
            <UserCircle size={18} />
            <span>{account.username}</span>
          </div>
          <button type="button" onClick={signOut}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <Suspense fallback={<div className="empty-state page-loader">Memuat halaman...</div>}>
          {route === "calculator" && <CalculatorPage />}
          {route === "customers" && <CustomerListPage />}
          {route === "customerDetail" && <CustomerDetailPage />}
          {route === "users" && <UserManagementPage />}
        </Suspense>
      </main>
    </div>
  );
}
