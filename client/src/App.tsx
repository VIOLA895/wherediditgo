import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileUp,
  Fingerprint,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import "./App.css";

type Page = "Overview" | "Transactions" | "Insights" | "Import";
type Period = "7 days" | "30 days" | "90 days";

const navigation = [
  { name: "Overview" as Page, icon: LayoutDashboard, number: "01" },
  { name: "Transactions" as Page, icon: CreditCard, number: "02" },
  { name: "Insights" as Page, icon: Activity, number: "03" },
  { name: "Import" as Page, icon: FileUp, number: "04" },
];

type ApiTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  merchant?: string | null;
};

type PreviewRow = {
  lineNumber: number;
  date: string | null;
  description: string;
  amount: number | null;
  type: "INCOME" | "EXPENSE" | "UNKNOWN";
  category: string;
  merchant?: string | null;
  valid: boolean;
  errors: string[];
  isDuplicate: boolean;
};

type PreviewSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importableRows: number;
};

type TransactionView = {
  id: string;
  merchant: string;
  detail: string;
  date: string;
  amount: number;
  category: string;
  icon: string;
  color: string;
};

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const money = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [period, setPeriod] = useState<Period>("30 days");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("wherediditgo_token"),
  );
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("wherediditgo_email") || "",
  );
  const [email, setEmail] = useState("testuser@example.com");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [dataBusy, setDataBusy] = useState(() => Boolean(token));
  const [dataError, setDataError] = useState("");

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(
    null,
  );
  const [previewCsvText, setPreviewCsvText] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");
  const [selectedLineNumbers, setSelectedLineNumbers] = useState<number[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const requestTransactions = async (authToken: string) => {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Could not load transactions.");
    }

    const items: ApiTransaction[] = payload.transactions || [];

    setTransactions(
      items.map((item) => ({
        id: item.id,
        merchant: item.merchant || item.description,
        detail: item.category,
        date: new Date(item.date).toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        amount:
          item.type === "INCOME" ? Number(item.amount) : -Number(item.amount),
        category: item.category,
        icon: (item.merchant || item.description || "?")
          .trim()
          .charAt(0)
          .toUpperCase(),
        color: item.type === "INCOME" ? "lime" : "orange",
      })),
    );
  };

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetch(`${API_BASE_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Could not load transactions.");
        }

        return payload.transactions as ApiTransaction[];
      })
      .then((items) => {
        if (cancelled) return;

        setTransactions(
          items.map((item) => ({
            id: item.id,
            merchant: item.merchant || item.description,
            detail: item.category,
            date: new Date(item.date).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            amount:
              item.type === "INCOME"
                ? Number(item.amount)
                : -Number(item.amount),
            category: item.category,
            icon: (item.merchant || item.description || "?")
              .trim()
              .charAt(0)
              .toUpperCase(),
            color: item.type === "INCOME" ? "lime" : "orange",
          })),
        );
      })
      .catch((error: Error) => {
        if (cancelled) return;

        setDataError(error.message);

        if (/token|auth|unauthor/i.test(error.message)) {
          localStorage.removeItem("wherediditgo_token");
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDataBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const totalIncome = transactions.reduce(
    (sum, transaction) => sum + Math.max(transaction.amount, 0),
    0,
  );

  const totalExpenses = transactions.reduce(
    (sum, transaction) => sum + Math.max(-transaction.amount, 0),
    0,
  );

  const netTotal = totalIncome - totalExpenses;

  const liveChartData = useMemo(() => {
    const days = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
    const cutoff = new Date();

    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);

    const grouped = new Map<
      string,
      { day: string; income: number; spending: number; key: number }
    >();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);

      if (date < cutoff) return;

      const key = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).getTime();

      const label = date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
      });

      const entry = grouped.get(String(key)) || {
        day: label,
        income: 0,
        spending: 0,
        key,
      };

      if (transaction.amount > 0) {
        entry.income += transaction.amount;
      } else {
        entry.spending += Math.abs(transaction.amount);
      }

      grouped.set(String(key), entry);
    });

    return Array.from(grouped.values())
      .sort((a, b) => a.key - b.key)
      .map(({ day, income, spending }) => ({ day, income, spending }));
  }, [transactions, period]);

  const visibleTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        `${transaction.merchant} ${transaction.category} ${transaction.detail}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [transactions, search],
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success || !payload.token) {
        throw new Error(
          payload.message || "Login failed. Check your email and password.",
        );
      }

      localStorage.setItem("wherediditgo_token", payload.token);
      localStorage.setItem(
        "wherediditgo_email",
        payload.user?.email || email.trim(),
      );

      setUserEmail(payload.user?.email || email.trim());
      setDataBusy(true);
      setDataError("");
      setToken(payload.token);
      setPassword("");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Could not connect to the server.",
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wherediditgo_token");
    localStorage.removeItem("wherediditgo_email");

    setToken(null);
    setUserEmail("");
    setTransactions([]);
    setPreviewRows([]);
    setPreviewSummary(null);
  };

  const handlePreview = async () => {
    if (!selectedFile || !token) return;

    setImportBusy(true);
    setImportError("");
    setImportSuccess("");

    try {
      if (selectedFile.size > 2 * 1024 * 1024) {
        throw new Error(
          "This CSV is larger than 2 MB. Please choose a smaller file.",
        );
      }

      const csvText = await selectedFile.text();

      const response = await fetch(
        `${API_BASE_URL}/transactions/import/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            csvText,
            fileName: selectedFile.name,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Could not preview this CSV.");
      }

      setPreviewRows(payload.rows || []);
      setPreviewSummary(payload.summary);
      setPreviewCsvText(csvText);
      setPreviewFileName(selectedFile.name);

      setSelectedLineNumbers(
        (payload.rows || [])
          .filter((row: PreviewRow) => row.valid && !row.isDuplicate)
          .map((row: PreviewRow) => row.lineNumber),
      );
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not preview this file.",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!token || !previewSummary || selectedLineNumbers.length === 0) {
      return;
    }

    setImportBusy(true);
    setImportError("");
    setImportSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/import/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            csvText: previewCsvText,
            fileName: previewFileName,
            selectedLineNumbers,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Import failed.");
      }

      await requestTransactions(token);

      setImportSuccess(
        `Import complete: ${
          payload.summary?.importedRows ?? selectedLineNumbers.length
        } transactions saved.`,
      );

      setPreviewRows([]);
      setPreviewSummary(null);
      setSelectedLineNumbers([]);
      setSelectedFile(null);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const goTo = (nextPage: Page) => {
    setPage(nextPage);
    setMobileOpen(false);
  };

  if (!token) {
    return (
      <div
        className="wherediditgo-login"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
          background: "#f6f6f0",
          color: "#20231e",
        }}
      >
        <section
          style={{
            padding: "clamp(32px, 7vw, 100px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#20231e",
            color: "#f6f6f0",
          }}
        >
          <div className="brand">
            <div className="brand-symbol">
              <span />
              <span />
              <span />
            </div>
            <span>
              where<span className="brand-light">did</span>itgo
              <span className="brand-period">.</span>
            </span>
          </div>

          <div style={{ maxWidth: 520, margin: "70px 0" }}>
            <div className="eyebrow">
              <span className="eyebrow-dot" /> YOUR FINANCIAL FIELD NOTES
            </div>

            <h1
              style={{
                fontSize: "clamp(42px, 6vw, 78px)",
                lineHeight: 0.98,
                letterSpacing: "-0.06em",
                margin: "24px 0",
              }}
            >
              Know your money.
              <br />
              <span style={{ color: "#d5f36a" }}>Know yourself.</span>
            </h1>

            <p
              style={{
                color: "#c5c7bc",
                lineHeight: 1.8,
                maxWidth: 420,
              }}
            >
              A clearer picture of what comes in, what goes out, and what it all
              means.
            </p>
          </div>

          <div
            style={{
              color: "#aeb0a5",
              fontSize: 11,
              letterSpacing: ".14em",
            }}
          >
            PRIVATE BY DESIGN · BUILT FOR CLARITY
          </div>
        </section>

        <section
          style={{
            padding: "32px",
            display: "grid",
            placeItems: "center",
          }}
        >
          <form
            onSubmit={handleLogin}
            style={{
              width: "100%",
              maxWidth: 390,
              background: "#fff",
              border: "1px solid #e8e8df",
              borderRadius: 20,
              padding: "clamp(24px, 4vw, 40px)",
              boxShadow: "0 24px 80px rgba(32,35,30,.08)",
            }}
          >
            <div className="section-label">YOUR PERSONAL SPACE</div>

            <h2
              style={{
                fontSize: 30,
                letterSpacing: "-.04em",
                margin: "12px 0 8px",
              }}
            >
              Welcome back<span style={{ color: "#7b9629" }}>.</span>
            </h2>

            <p
              style={{
                color: "#77796e",
                lineHeight: 1.65,
                fontSize: 14,
                marginBottom: 28,
              }}
            >
              Sign in to load your real transactions and spending data.
            </p>

            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              EMAIL ADDRESS
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "13px 14px",
                border: "1px solid #dedfd5",
                borderRadius: 9,
                marginBottom: 18,
                background: "#fbfbf8",
                color: "#20231e",
                boxSizing: "border-box",
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              PASSWORD
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "13px 14px",
                border: "1px solid #dedfd5",
                borderRadius: 9,
                marginBottom: 18,
                background: "#fbfbf8",
                color: "#20231e",
                boxSizing: "border-box",
              }}
            />

            {loginError && (
              <p
                role="alert"
                style={{
                  color: "#b5472d",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="primary-button"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 8,
                opacity: loginBusy ? 0.7 : 1,
              }}
            >
              {loginBusy ? "Signing in…" : "Sign in"}
              <ArrowUpRight size={15} />
            </button>

            <p
              style={{
                marginTop: 20,
                color: "#898b80",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Use the account you registered with. This app connects to your
              local WhereDidItGo API.
            </p>
          </form>
        </section>

        <style>{`
          @media (max-width: 760px) {
            .wherediditgo-login {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol">
            <span />
            <span />
            <span />
          </div>

          <span>
            where<span className="brand-light">did</span>itgo
            <span className="brand-period">.</span>
          </span>

          <button
            className="mobile-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">YOUR MONEY, DECODED</div>

        <div className="profile-switcher">
          <div className="profile-avatar">V</div>
          <div className="profile-copy">
            <strong>Personal space</strong>
            <span>My finances</span>
          </div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon, number }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "nav-item-active" : ""}`}
              onClick={() => goTo(name)}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{name}</span>

              {name === "Import" && <span className="nav-new">NEW</span>}

              {page === name && <span className="nav-number">{number}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-note">
            <div className="privacy-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <strong>Your money stays yours.</strong>
              <p>Private by design. Always.</p>
            </div>
          </div>

          <button
            className="nav-item settings-button"
            onClick={() =>
              alert(
                "Settings will be available when account preferences are connected.",
              )
            }
          >
            <Settings2 size={17} />
            <span>Settings</span>
          </button>

          <div className="sidebar-footer">
            <span>BUILT FOR CLARITY</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <div className="demo-status">
              <span /> LIVE DATA
            </div>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
              <i />
            </button>

            <button
              className="topbar-avatar"
              title={`Signed in as ${userEmail}. Click to sign out`}
              onClick={handleLogout}
              aria-label="Sign out"
            >
              {(userEmail || "V").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <div className="page-content">
          {dataBusy && (
            <div
              style={{
                marginBottom: 14,
                color: "#77796e",
                fontSize: 12,
              }}
            >
              Loading your transactions…
            </div>
          )}

          {dataError && (
            <div
              role="alert"
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 9,
                background: "#fff0eb",
                color: "#9d3e25",
                fontSize: 13,
              }}
            >
              {dataError}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {page === "Overview" && (
                <>
                  <section className="hero-heading">
                    <div>
                      <div className="eyebrow">
                        <span className="eyebrow-dot" />
                        YOUR FINANCIAL FIELD NOTES
                        <span className="eyebrow-line" />
                      </div>

                      <h1>
                        Know your money.
                        <br />
                        <span>Know yourself.</span>
                      </h1>

                      <p className="hero-description">
                        A clearer picture of what comes in, what goes out, and
                        what it all means.
                      </p>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => goTo("Import")}
                    >
                      <FileUp size={16} />
                      Import statement
                      <ArrowUpRight size={15} />
                    </button>
                  </section>

                  <section className="period-row">
                    <div className="period-context">
                      <CalendarDays size={15} />
                      <span>YOUR MONEY, OVER TIME</span>
                    </div>

                    <div className="period-control" aria-label="Chart period">
                      {(["7 days", "30 days", "90 days"] as Period[]).map(
                        (value) => (
                          <button
                            key={value}
                            onClick={() => setPeriod(value)}
                            className={period === value ? "period-active" : ""}
                          >
                            {value}
                          </button>
                        ),
                      )}
                    </div>
                  </section>

                  <section className="metrics-grid">
                    <article className="metric-card metric-primary">
                      <div className="metric-top">
                        <span>NET RECORDED CASH FLOW</span>
                        <Wallet size={17} />
                      </div>

                      <div className="metric-value">
                        {money(netTotal)}
                        <span className="metric-period">KES</span>
                      </div>

                      <div className="metric-bottom">
                        <span className="metric-indicator">
                          <ShieldCheck size={13} /> REAL
                        </span>
                        <span>income minus expenses</span>
                      </div>

                      <div className="metric-watermark">KES</div>
                    </article>

                    <article className="metric-card">
                      <div className="metric-top">
                        <span>MONEY IN</span>
                        <span className="metric-icon income-icon">
                          <ArrowDownLeft size={16} />
                        </span>
                      </div>

                      <div className="metric-value">{money(totalIncome)}</div>

                      <div className="metric-bottom">
                        <span className="metric-indicator">
                          <ArrowDownLeft size={13} />{" "}
                          {transactions.filter((t) => t.amount > 0).length}
                        </span>
                        <span>income transactions</span>
                      </div>

                      <div className="metric-mini-bars" aria-hidden="true">
                        {[22, 32, 25, 45, 36, 60, 47, 76, 51, 84, 68, 100].map(
                          (height, i) => (
                            <i key={i} style={{ height: `${height}%` }} />
                          ),
                        )}
                      </div>
                    </article>

                    <article className="metric-card">
                      <div className="metric-top">
                        <span>MONEY OUT</span>
                        <span className="metric-icon expense-icon">
                          <ArrowUpRight size={16} />
                        </span>
                      </div>

                      <div className="metric-value">{money(totalExpenses)}</div>

                      <div className="metric-bottom">
                        <span className="metric-indicator metric-negative">
                          <ArrowUpRight size={13} />{" "}
                          {transactions.filter((t) => t.amount < 0).length}
                        </span>
                        <span>expense transactions</span>
                      </div>

                      <div
                        className="metric-mini-bars expense-bars"
                        aria-hidden="true"
                      >
                        {[80, 65, 91, 52, 72, 40, 63, 33, 56, 42, 28, 18].map(
                          (height, i) => (
                            <i key={i} style={{ height: `${height}%` }} />
                          ),
                        )}
                      </div>
                    </article>

                    <article className="metric-card metric-net">
                      <div className="metric-top">
                        <span>YOU KEPT</span>
                        <Sparkles size={17} />
                      </div>

                      <div className="metric-value">{money(netTotal)}</div>

                      <div className="net-progress">
                        <span />
                      </div>

                      <div className="metric-bottom">
                        <strong>
                          {totalIncome > 0
                            ? `${((netTotal / totalIncome) * 100).toFixed(
                                1,
                              )}% net rate`
                            : "No income yet"}
                        </strong>
                        <span>of recorded income</span>
                      </div>
                    </article>
                  </section>

                  <section className="analysis-grid">
                    <article className="panel flow-panel">
                      <div className="panel-heading">
                        <div>
                          <SectionLabel>THE BIG PICTURE</SectionLabel>
                          <h2>
                            Your money in motion
                            <span className="heading-period"> / {period}</span>
                          </h2>
                        </div>

                        <button
                          className="icon-button subtle-button"
                          aria-label="Chart options"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </div>

                      <div className="chart-legend">
                        <span>
                          <i className="legend-dot legend-income" /> Money in
                        </span>
                        <span>
                          <i className="legend-dot legend-spending" /> Money out
                        </span>
                        <span className="chart-unit">
                          {transactions.length
                            ? "BASED ON YOUR DATA"
                            : "NO DATA YET"}
                        </span>
                      </div>

                      <div className="flow-chart">
                        {liveChartData.length === 0 ? (
                          <div className="empty-state">
                            <Activity size={22} />
                            <strong>No transactions in this period</strong>
                            <span>
                              Import a statement to see your money in motion.
                            </span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={liveChartData}
                              margin={{
                                top: 10,
                                right: 5,
                                left: -23,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="incomeFill"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#d5f36a"
                                    stopOpacity={0.55}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#d5f36a"
                                    stopOpacity={0.02}
                                  />
                                </linearGradient>

                                <linearGradient
                                  id="spendingFill"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#e97b50"
                                    stopOpacity={0.18}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#e97b50"
                                    stopOpacity={0.01}
                                  />
                                </linearGradient>
                              </defs>

                              <CartesianGrid
                                vertical={false}
                                stroke="#e8e8df"
                                strokeDasharray="3 5"
                              />

                              <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#929388", fontSize: 11 }}
                                dy={11}
                              />

                              <Tooltip
                                contentStyle={{
                                  background: "#20231e",
                                  border: "none",
                                  borderRadius: "10px",
                                  color: "#fff",
                                  fontSize: "12px",
                                  padding: "10px 13px",
                                }}
                                labelStyle={{
                                  color: "#d5f36a",
                                  marginBottom: 5,
                                }}
                                formatter={(value) => [
                                  money(Number(value)),
                                  "",
                                ]}
                              />

                              <Area
                                type="monotone"
                                dataKey="income"
                                name="Money in"
                                stroke="#7b9629"
                                strokeWidth={2.5}
                                fill="url(#incomeFill)"
                                activeDot={{
                                  r: 4,
                                  strokeWidth: 0,
                                  fill: "#7b9629",
                                }}
                              />

                              <Area
                                type="monotone"
                                dataKey="spending"
                                name="Money out"
                                stroke="#e97b50"
                                strokeWidth={2}
                                fill="url(#spendingFill)"
                                activeDot={{
                                  r: 4,
                                  strokeWidth: 0,
                                  fill: "#e97b50",
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      <div className="chart-foot">
                        <span>
                          <span className="chart-foot-dot" /> A steady gap is a
                          good sign.
                        </span>
                        <button onClick={() => goTo("Insights")}>
                          Explore your patterns <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </article>

                    <article className="insight-panel">
                      <div className="insight-top">
                        <div className="insight-symbol">
                          <Lightbulb size={19} />
                        </div>
                        <span>AN EARLY OBSERVATION</span>
                        <span className="insight-spark">✳</span>
                      </div>

                      <div className="insight-kicker">
                        YOUR MONEY HAS A PATTERN
                      </div>

                      <h2>
                        Small spends.
                        <br />
                        Big picture.
                      </h2>

                      <p>
                        Your everyday purchases may look small on their own.
                        Together, they can tell you a lot about your habits.
                      </p>

                      <div className="insight-rule" />

                      <div className="insight-bottom">
                        <span>
                          INSIGHT 001{" "}
                          <span className="insight-demo">· YOUR DATA</span>
                        </span>
                        <button onClick={() => goTo("Insights")}>
                          Take a closer look <ArrowUpRight size={14} />
                        </button>
                      </div>

                      <div className="insight-orbit orbit-one" />
                      <div className="insight-orbit orbit-two" />
                    </article>
                  </section>

                  <section className="transactions-panel panel">
                    <div className="panel-heading transactions-heading">
                      <div>
                        <SectionLabel>THE LATEST MOVES</SectionLabel>
                        <h2>Your recent transactions</h2>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => goTo("Transactions")}
                      >
                        All transactions <ArrowUpRight size={14} />
                      </button>
                    </div>

                    <div className="transaction-list">
                      {transactions.slice(0, 4).map((transaction) => (
                        <div className="transaction-row" key={transaction.id}>
                          <div
                            className={`merchant-avatar avatar-${transaction.color}`}
                          >
                            {transaction.icon}
                          </div>

                          <div className="transaction-name">
                            <strong>{transaction.merchant}</strong>
                            <span>{transaction.detail}</span>
                          </div>

                          <div className="transaction-date">
                            {transaction.date}
                          </div>

                          <div
                            className={`transaction-amount ${
                              transaction.amount > 0 ? "amount-in" : ""
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : "−"}
                            {money(Math.abs(transaction.amount))}
                          </div>

                          <div
                            className={`transaction-tag ${
                              transaction.category === "Income"
                                ? "tag-income"
                                : ""
                            }`}
                          >
                            {transaction.category}
                          </div>
                        </div>
                      ))}

                      {transactions.length === 0 && (
                        <div className="empty-state">
                          <CreditCard size={22} />
                          <strong>No transactions yet</strong>
                          <span>
                            Import your first statement to get started.
                          </span>
                          <button
                            className="text-button"
                            onClick={() => goTo("Import")}
                          >
                            Import a statement <ArrowUpRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  <footer className="page-footer">
                    <span>MAKE SENSE OF EVERY SHILLING.</span>
                    <span>
                      PRIVATE WORKSPACE <span className="footer-dot" /> REAL
                      ACCOUNT DATA
                    </span>
                  </footer>
                </>
              )}

              {page === "Transactions" && (
                <section className="subpage">
                  <div className="eyebrow">
                    <span className="eyebrow-dot" /> EVERY SHILLING HAS A STORY
                  </div>

                  <div className="subpage-heading">
                    <div>
                      <h1>
                        The paper trail<span>.</span>
                      </h1>
                      <p>
                        Every transaction, in one place. Nothing hiding between
                        the lines.
                      </p>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => goTo("Import")}
                    >
                      <FileUp size={16} />
                      Import statement
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="transactions-summary">
                    <div>
                      <span>TRANSACTIONS SHOWN</span>
                      <strong>
                        {visibleTransactions.length.toString().padStart(2, "0")}
                      </strong>
                    </div>
                    <div>
                      <span>MONEY IN</span>
                      <strong>{money(totalIncome)}</strong>
                    </div>
                    <div>
                      <span>MONEY OUT</span>
                      <strong>{money(totalExpenses)}</strong>
                    </div>
                  </div>

                  <div className="panel full-transactions">
                    <div className="transaction-tools">
                      <label className="search-field">
                        <Search size={16} />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Find a merchant, category..."
                        />
                        <kbd> / </kbd>
                      </label>

                      <button
                        className="filter-button"
                        onClick={() => setSearch("")}
                      >
                        <Settings2 size={15} /> Clear search
                      </button>
                    </div>

                    <div className="transaction-list">
                      {visibleTransactions.map((transaction) => (
                        <div className="transaction-row" key={transaction.id}>
                          <div
                            className={`merchant-avatar avatar-${transaction.color}`}
                          >
                            {transaction.icon}
                          </div>

                          <div className="transaction-name">
                            <strong>{transaction.merchant}</strong>
                            <span>{transaction.detail}</span>
                          </div>

                          <div className="transaction-date">
                            {transaction.date}
                          </div>

                          <div
                            className={`transaction-amount ${
                              transaction.amount > 0 ? "amount-in" : ""
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : "−"}
                            {money(Math.abs(transaction.amount))}
                          </div>

                          <div
                            className={`transaction-tag ${
                              transaction.category === "Income"
                                ? "tag-income"
                                : ""
                            }`}
                          >
                            {transaction.category}
                          </div>
                        </div>
                      ))}

                      {visibleTransactions.length === 0 && (
                        <div className="empty-state">
                          <Search size={22} />
                          <strong>No matching transactions</strong>
                          <span>Try a different merchant or category.</span>
                        </div>
                      )}
                    </div>

                    <div className="demo-table-note">
                      <ShieldCheck size={15} /> These transactions are loaded
                      from your private account through the authenticated API.
                    </div>
                  </div>
                </section>
              )}

              {page === "Insights" && (
                <section className="subpage">
                  <div className="eyebrow">
                    <span className="eyebrow-dot" /> PATTERNS WORTH NOTICING
                  </div>

                  <div className="subpage-heading">
                    <div>
                      <h1>
                        Read between
                        <br />
                        the numbers<span>.</span>
                      </h1>
                      <p>
                        Not financial advice. Just a clearer view of your
                        habits, based on your data.
                      </p>
                    </div>

                    <div className="insights-stamp">
                      <Fingerprint size={25} />
                      <span>
                        YOUR PATTERNS
                        <br />
                        YOUR PERSPECTIVE
                      </span>
                    </div>
                  </div>

                  <div className="insights-cards">
                    <article className="insight-feature">
                      <div className="insight-top">
                        <div className="insight-symbol">
                          <Sparkles size={18} />
                        </div>
                        <span>OBSERVATION 001 · YOUR DATA</span>
                      </div>

                      <div className="insight-kicker">THE MONTHLY PICTURE</div>

                      <h2>
                        {transactions.length
                          ? netTotal >= 0
                            ? "More came in than went out."
                            : "More went out than came in."
                          : "Your patterns start here."}
                      </h2>

                      <p>
                        {transactions.length
                          ? `Based on ${
                              transactions.length
                            } recorded transactions, you have ${money(
                              Math.abs(netTotal),
                            )} ${
                              netTotal >= 0
                                ? "left after recorded expenses"
                                : "more in expenses than income"
                            }. This is a summary of imported records, not necessarily your full financial position.`
                          : "Import a statement to see observations based on your actual transactions, with calculations you can verify."}
                      </p>

                      <div className="feature-stat">
                        <strong>
                          {totalIncome > 0
                            ? `${((netTotal / totalIncome) * 100).toFixed(1)}%`
                            : "—"}
                        </strong>
                        <span>Net rate of recorded income</span>
                      </div>
                    </article>

                    <article className="insight-small">
                      <div className="insight-icon-box">
                        <ArrowDownRight size={19} />
                      </div>
                      <SectionLabel>SPENDING RHYTHM</SectionLabel>
                      <h3>Look for the repeaters.</h3>
                      <p>
                        {transactions.length
                          ? `You have ${
                              transactions.filter((t) => t.amount < 0).length
                            } recorded expense transactions. Review merchants and categories to spot repeat spending.`
                          : "Import a statement to start identifying repeat spending."}
                      </p>
                      <span className="insight-number">PATTERN 02</span>
                    </article>

                    <article className="insight-small">
                      <div className="insight-icon-box">
                        <Activity size={19} />
                      </div>
                      <SectionLabel>CATEGORY SHIFTS</SectionLabel>
                      <h3>Compare like with like.</h3>
                      <p>
                        {transactions.length
                          ? `Your recorded expenses total ${money(
                              totalExpenses,
                            )}. Keep importing statements to compare periods more meaningfully.`
                          : "Comparing equivalent periods will help distinguish a genuine change from a one-off expense once data is available."}
                      </p>
                      <span className="insight-number">PATTERN 03</span>
                    </article>
                  </div>

                  <div className="honesty-note">
                    <CircleHelp size={17} />
                    <div>
                      <strong>
                        We believe insights should be explainable.
                      </strong>
                      <p>
                        Insights are calculated from the transactions currently
                        imported into your account. Incomplete statements may
                        not represent your full financial position.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {page === "Import" && (
                <section className="subpage import-subpage">
                  <div className="eyebrow">
                    <span className="eyebrow-dot" /> FROM RAW DATA TO REAL
                    CLARITY
                  </div>

                  <div className="subpage-heading">
                    <div>
                      <h1>
                        Bring your
                        <br />
                        money into focus<span>.</span>
                      </h1>
                      <p>
                        Start with a statement. We'll help turn rows of
                        transactions into something you can understand.
                      </p>
                    </div>

                    <div className="import-step-count">
                      <span>01</span>
                      <i />
                      <span>02</span>
                      <i />
                      <span>03</span>
                    </div>
                  </div>

                  <div className="import-workspace">
                    <div className="import-main">
                      <div className="import-step-label">
                        <span>STEP 01</span>
                        <span>YOUR SOURCE FILE</span>
                      </div>

                      <h2>
                        Drop the numbers.
                        <br />
                        <span>Find the meaning.</span>
                      </h2>

                      <p>
                        Choose a CSV statement exported from your bank or
                        financial app. You will review and confirm the
                        transactions before anything is saved.
                      </p>

                      <input
                        ref={fileInput}
                        type="file"
                        accept=".csv,text/csv"
                        className="visually-hidden"
                        onChange={(event) =>
                          setSelectedFile(event.target.files?.[0] ?? null)
                        }
                      />

                      <button
                        className={`dropzone ${
                          selectedFile ? "dropzone-selected" : ""
                        }`}
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const file = event.dataTransfer.files[0];

                          if (
                            file &&
                            file.name.toLowerCase().endsWith(".csv")
                          ) {
                            setSelectedFile(file);
                            setPreviewRows([]);
                            setPreviewSummary(null);
                            setImportError("");
                            setImportSuccess("");
                          }
                        }}
                      >
                        <div className="dropzone-icon">
                          {selectedFile ? (
                            <Check size={23} />
                          ) : (
                            <FileUp size={23} />
                          )}
                        </div>

                        <strong>
                          {selectedFile
                            ? selectedFile.name
                            : "Choose a statement to get started"}
                        </strong>

                        <span>
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(
                                1,
                              )} KB · Selected locally`
                            : "Drag a CSV here, or browse your files"}
                        </span>

                        <span className="file-type-label">
                          CSV FILES ONLY <i /> MAX SIZE WILL BE CHECKED ON
                          UPLOAD
                        </span>
                      </button>

                      {selectedFile && (
                        <div className="selected-file-note">
                          <Check size={15} />
                          <span>File selected and ready to preview.</span>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewRows([]);
                              setPreviewSummary(null);
                              setSelectedLineNumbers([]);

                              if (fileInput.current) {
                                fileInput.current.value = "";
                              }
                            }}
                            aria-label="Remove selected file"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}

                      {importError && (
                        <div
                          role="alert"
                          style={{
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 9,
                            background: "#fff0eb",
                            color: "#9d3e25",
                            fontSize: 13,
                          }}
                        >
                          {importError}
                        </div>
                      )}

                      {importSuccess && (
                        <div
                          role="status"
                          style={{
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 9,
                            background: "#eff7d8",
                            color: "#465b17",
                            fontSize: 13,
                          }}
                        >
                          {importSuccess}
                        </div>
                      )}

                      {previewSummary && (
                        <section
                          className="panel"
                          style={{ marginTop: 22, padding: 18 }}
                        >
                          <div className="panel-heading">
                            <div>
                              <SectionLabel>STEP 02 · REVIEW</SectionLabel>
                              <h2>{previewFileName}</h2>
                            </div>

                            <button
                              className="text-button"
                              onClick={() => {
                                setPreviewRows([]);
                                setPreviewSummary(null);
                                setSelectedLineNumbers([]);
                              }}
                            >
                              Clear preview <X size={14} />
                            </button>
                          </div>

                          <div
                            className="transactions-summary"
                            style={{ margin: "16px 0" }}
                          >
                            <div>
                              <span>TOTAL ROWS</span>
                              <strong>{previewSummary.totalRows}</strong>
                            </div>

                            <div>
                              <span>IMPORTABLE</span>
                              <strong>{previewSummary.importableRows}</strong>
                            </div>

                            <div>
                              <span>INVALID / DUPLICATE</span>
                              <strong>
                                {previewSummary.invalidRows} /{" "}
                                {previewSummary.duplicateRows}
                              </strong>
                            </div>
                          </div>

                          <div style={{ overflowX: "auto" }}>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 13,
                                minWidth: 560,
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    textAlign: "left",
                                    color: "#77796e",
                                    borderBottom: "1px solid #e8e8df",
                                  }}
                                >
                                  <th style={{ padding: "10px 8px" }}>
                                    Import
                                  </th>
                                  <th style={{ padding: "10px 8px" }}>Date</th>
                                  <th style={{ padding: "10px 8px" }}>
                                    Description
                                  </th>
                                  <th style={{ padding: "10px 8px" }}>
                                    Type / category
                                  </th>
                                  <th
                                    style={{
                                      padding: "10px 8px",
                                      textAlign: "right",
                                    }}
                                  >
                                    Amount
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {previewRows.map((row) => {
                                  const eligible =
                                    row.valid && !row.isDuplicate;
                                  const checked = selectedLineNumbers.includes(
                                    row.lineNumber,
                                  );

                                  return (
                                    <tr
                                      key={row.lineNumber}
                                      style={{
                                        borderBottom: "1px solid #efefe8",
                                        opacity: eligible ? 1 : 0.58,
                                      }}
                                    >
                                      <td style={{ padding: "11px 8px" }}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Import ${row.description}`}
                                          disabled={!eligible}
                                          checked={checked}
                                          onChange={(event) =>
                                            setSelectedLineNumbers((current) =>
                                              event.target.checked
                                                ? [...current, row.lineNumber]
                                                : current.filter(
                                                    (line) =>
                                                      line !== row.lineNumber,
                                                  ),
                                            )
                                          }
                                        />
                                      </td>

                                      <td
                                        style={{
                                          padding: "11px 8px",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {row.date
                                          ? new Date(
                                              row.date,
                                            ).toLocaleDateString("en-KE", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })
                                          : "—"}
                                      </td>

                                      <td style={{ padding: "11px 8px" }}>
                                        <strong>{row.description}</strong>

                                        {row.errors.length > 0 && (
                                          <div
                                            style={{
                                              color: "#b5472d",
                                              fontSize: 11,
                                            }}
                                          >
                                            {row.errors.join(", ")}
                                          </div>
                                        )}

                                        {row.isDuplicate && (
                                          <div
                                            style={{
                                              color: "#92712c",
                                              fontSize: 11,
                                            }}
                                          >
                                            Possible duplicate — excluded
                                          </div>
                                        )}
                                      </td>

                                      <td style={{ padding: "11px 8px" }}>
                                        {row.type}
                                        <div
                                          style={{
                                            color: "#77796e",
                                            fontSize: 11,
                                          }}
                                        >
                                          {row.category}
                                        </div>
                                      </td>

                                      <td
                                        style={{
                                          padding: "11px 8px",
                                          textAlign: "right",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {row.amount === null
                                          ? "—"
                                          : money(row.amount)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <button
                            className="primary-button import-continue"
                            disabled={
                              importBusy || selectedLineNumbers.length === 0
                            }
                            onClick={handleConfirmImport}
                            style={{
                              marginTop: 18,
                              opacity:
                                importBusy || selectedLineNumbers.length === 0
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {importBusy
                              ? "Importing…"
                              : `Confirm ${selectedLineNumbers.length} transaction${
                                  selectedLineNumbers.length === 1 ? "" : "s"
                                }`}
                            <Check size={15} />
                          </button>
                        </section>
                      )}

                      <div className="import-assurances">
                        <span>
                          <ShieldCheck size={16} /> Review before saving
                        </span>
                        <span>
                          <Fingerprint size={16} /> Duplicate-aware imports
                        </span>
                      </div>

                      <button
                        className="primary-button import-continue"
                        disabled={!selectedFile || importBusy}
                        onClick={handlePreview}
                        style={{
                          opacity: !selectedFile || importBusy ? 0.6 : 1,
                        }}
                      >
                        {importBusy && !previewSummary
                          ? "Preparing preview…"
                          : "Continue to preview"}
                        <ArrowUpRight size={15} />
                      </button>
                    </div>

                    <aside className="import-aside">
                      <div className="import-aside-index">
                        A NOTE ON YOUR DATA
                      </div>
                      <div className="import-aside-mark">
                        <ShieldCheck size={22} />
                      </div>
                      <h3>Your statement is yours.</h3>
                      <p>
                        We won't silently import a file. The workflow gives you
                        a preview, explains rows it can't read, and flags
                        possible duplicates before you commit.
                      </p>
                      <div className="import-aside-line" />
                      <span>NO SURPRISES. NO SILENT IMPORTS.</span>
                    </aside>
                  </div>

                  <div className="import-bottom-note">
                    <Lightbulb size={16} />
                    <span>
                      Tip: export your statement as CSV from your provider.
                      Avoid uploading files containing passwords or PINs.
                    </span>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
