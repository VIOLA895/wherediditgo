
import { useMemo, useRef, useState } from "react";
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

const chartData: Record<Period, { day: string; income: number; spending: number }[]> = {
  "7 days": [
    { day: "Mon", income: 950, spending: 430 },
    { day: "Tue", income: 950, spending: 680 },
    { day: "Wed", income: 950, spending: 390 },
    { day: "Thu", income: 950, spending: 820 },
    { day: "Fri", income: 950, spending: 540 },
    { day: "Sat", income: 950, spending: 740 },
    { day: "Sun", income: 950, spending: 310 },
  ],
  "30 days": [
    { day: "01", income: 1200, spending: 740 },
    { day: "05", income: 1200, spending: 910 },
    { day: "10", income: 1200, spending: 610 },
    { day: "15", income: 1200, spending: 1050 },
    { day: "20", income: 1200, spending: 820 },
    { day: "25", income: 1200, spending: 690 },
    { day: "30", income: 1200, spending: 940 },
  ],
  "90 days": [
    { day: "Aug", income: 1050, spending: 790 },
    { day: "Mid", income: 1050, spending: 680 },
    { day: "Sep", income: 1300, spending: 920 },
    { day: "Mid", income: 1300, spending: 750 },
    { day: "Oct", income: 1200, spending: 860 },
    { day: "Mid", income: 1200, spending: 610 },
    { day: "Now", income: 1200, spending: 690 },
  ],
};

const transactions = [
  { id: 1, merchant: "Java House", detail: "Food & drink", date: "Today, 11:42 AM", amount: -680, category: "Food", icon: "J", color: "orange" },
  { id: 2, merchant: "Safaricom", detail: "M-Pesa · Mobile", date: "Today, 09:18 AM", amount: -200, category: "Utilities", icon: "S", color: "green" },
  { id: 3, merchant: "Monthly salary", detail: "Income · Bank transfer", date: "Yesterday", amount: 45000, category: "Income", icon: "↗", color: "lime" },
  { id: 4, merchant: "Naivas", detail: "Groceries", date: "Yesterday", amount: -2450, category: "Groceries", icon: "N", color: "blue" },
  { id: 5, merchant: "Uber", detail: "Transport", date: "14 Oct", amount: -530, category: "Transport", icon: "U", color: "ink" },
];

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

  const visibleTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        `${transaction.merchant} ${transaction.category} ${transaction.detail}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );

  const goTo = (nextPage: Page) => {
    setPage(nextPage);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol"><span /><span /><span /></div>
          <span>where<span className="brand-light">did</span>itgo<span className="brand-period">.</span></span>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
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
            <div className="privacy-icon"><ShieldCheck size={16} /></div>
            <div>
              <strong>Your money stays yours.</strong>
              <p>Private by design. Always.</p>
            </div>
          </div>
          <button className="nav-item settings-button" onClick={() => alert("Settings will be available when account preferences are connected.")}>
            <Settings2 size={17} />
            <span>Settings</span>
          </button>
          <div className="sidebar-footer">
            <span>BUILT FOR CLARITY</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <div className="demo-status"><span /> DEMO DATA</div>
            <button className="icon-button notification-button" aria-label="Notifications" title="Notifications"><Bell size={17} /><i /></button>
            <div className="topbar-avatar">V</div>
          </div>
        </header>

        <div className="page-content">
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
                      <div className="eyebrow"><span className="eyebrow-dot" /> YOUR FINANCIAL FIELD NOTES <span className="eyebrow-line" /></div>
                      <h1>Know your money.<br /><span>Know yourself.</span></h1>
                      <p className="hero-description">A clearer picture of what comes in, what goes out, and what it all means.</p>
                    </div>
                    <button className="primary-button" onClick={() => goTo("Import")}><FileUp size={16} /> Import statement <ArrowUpRight size={15} /></button>
                  </section>

                  <section className="period-row">
                    <div className="period-context"><CalendarDays size={15} /><span>YOUR MONEY, OVER TIME</span></div>
                    <div className="period-control" aria-label="Chart period">
                      {(["7 days", "30 days", "90 days"] as Period[]).map((value) => (
                        <button key={value} onClick={() => setPeriod(value)} className={period === value ? "period-active" : ""}>{value}</button>
                      ))}
                    </div>
                  </section>

                  <section className="metrics-grid">
                    <article className="metric-card metric-primary">
                      <div className="metric-top"><span>AVAILABLE BALANCE</span><Wallet size={17} /></div>
                      <div className="metric-value">{money(68420)}<span className="metric-period">KES</span></div>
                      <div className="metric-bottom"><span className="metric-indicator"><ArrowUpRight size={13} /> 8.4%</span><span>vs. last month</span><span className="metric-footnote">DEMO</span></div>
                      <div className="metric-watermark">KES</div>
                    </article>
                    <article className="metric-card">
                      <div className="metric-top"><span>MONEY IN</span><span className="metric-icon income-icon"><ArrowDownLeft size={16} /></span></div>
                      <div className="metric-value">{money(85000)}</div>
                      <div className="metric-bottom"><span className="metric-indicator"><ArrowUpRight size={13} /> 12.2%</span><span>vs. last month</span></div>
                      <div className="metric-mini-bars" aria-hidden="true">{[22, 32, 25, 45, 36, 60, 47, 76, 51, 84, 68, 100].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div>
                    </article>
                    <article className="metric-card">
                      <div className="metric-top"><span>MONEY OUT</span><span className="metric-icon expense-icon"><ArrowUpRight size={16} /></span></div>
                      <div className="metric-value">{money(42380)}</div>
                      <div className="metric-bottom"><span className="metric-indicator metric-negative"><ArrowDownRight size={13} /> 4.6%</span><span>less than last month</span></div>
                      <div className="metric-mini-bars expense-bars" aria-hidden="true">{[80, 65, 91, 52, 72, 40, 63, 33, 56, 42, 28, 18].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div>
                    </article>
                    <article className="metric-card metric-net">
                      <div className="metric-top"><span>YOU KEPT</span><Sparkles size={17} /></div>
                      <div className="metric-value">{money(42620)}</div>
                      <div className="net-progress"><span /></div>
                      <div className="metric-bottom"><strong>50.1% savings rate</strong><span>of money in</span></div>
                    </article>
                  </section>

                  <section className="analysis-grid">
                    <article className="panel flow-panel">
                      <div className="panel-heading">
                        <div><SectionLabel>THE BIG PICTURE</SectionLabel><h2>Your money in motion<span className="heading-period"> / {period}</span></h2></div>
                        <button className="icon-button subtle-button" aria-label="Chart options"><MoreHorizontal size={20} /></button>
                      </div>
                      <div className="chart-legend">
                        <span><i className="legend-dot legend-income" /> Money in</span>
                        <span><i className="legend-dot legend-spending" /> Money out</span>
                        <span className="chart-unit">ILLUSTRATIVE FLOW</span>
                      </div>
                      <div className="flow-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData[period]} margin={{ top: 10, right: 5, left: -23, bottom: 0 }}>
                            <defs>
                              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d5f36a" stopOpacity={0.55} /><stop offset="100%" stopColor="#d5f36a" stopOpacity={0.02} /></linearGradient>
                              <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e97b50" stopOpacity={0.18} /><stop offset="100%" stopColor="#e97b50" stopOpacity={0.01} /></linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#e8e8df" strokeDasharray="3 5" />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#929388", fontSize: 11 }} dy={11} />
                            <Tooltip
                              contentStyle={{ background: "#20231e", border: "none", borderRadius: "10px", color: "#fff", fontSize: "12px", padding: "10px 13px" }}
                              labelStyle={{ color: "#d5f36a", marginBottom: 5 }}
                              formatter={(value) => [money(Number(value)), ""]}
                            />
                            <Area type="monotone" dataKey="income" name="Money in" stroke="#7b9629" strokeWidth={2.5} fill="url(#incomeFill)" activeDot={{ r: 4, strokeWidth: 0, fill: "#7b9629" }} />
                            <Area type="monotone" dataKey="spending" name="Money out" stroke="#e97b50" strokeWidth={2} fill="url(#spendingFill)" activeDot={{ r: 4, strokeWidth: 0, fill: "#e97b50" }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-foot"><span><span className="chart-foot-dot" /> A steady gap is a good sign.</span><button onClick={() => goTo("Insights")}>Explore your patterns <ArrowUpRight size={14} /></button></div>
                    </article>

                    <article className="insight-panel">
                      <div className="insight-top"><div className="insight-symbol"><Lightbulb size={19} /></div><span>AN EARLY OBSERVATION</span><span className="insight-spark">✳</span></div>
                      <div className="insight-kicker">YOUR MONEY HAS A PATTERN</div>
                      <h2>Small spends.<br />Big picture.</h2>
                      <p>Your everyday purchases may look small on their own. Together, they can tell you a lot about your habits.</p>
                      <div className="insight-rule" />
                      <div className="insight-bottom"><span>INSIGHT 001 <span className="insight-demo">· DEMO</span></span><button onClick={() => goTo("Insights")}>Take a closer look <ArrowUpRight size={14} /></button></div>
                      <div className="insight-orbit orbit-one" /><div className="insight-orbit orbit-two" />
                    </article>
                  </section>

                  <section className="transactions-panel panel">
                    <div className="panel-heading transactions-heading">
                      <div><SectionLabel>THE LATEST MOVES</SectionLabel><h2>Your recent transactions</h2></div>
                      <button className="text-button" onClick={() => goTo("Transactions")}>All transactions <ArrowUpRight size={14} /></button>
                    </div>
                    <div className="transaction-list">
                      {transactions.slice(0, 4).map((transaction) => (
                        <div className="transaction-row" key={transaction.id}>
                          <div className={`merchant-avatar avatar-${transaction.color}`}>{transaction.icon}</div>
                          <div className="transaction-name"><strong>{transaction.merchant}</strong><span>{transaction.detail}</span></div>
                          <div className="transaction-date">{transaction.date}</div>
                          <div className={`transaction-amount ${transaction.amount > 0 ? "amount-in" : ""}`}>{transaction.amount > 0 ? "+" : "−"}{money(Math.abs(transaction.amount))}</div>
                          <div className={`transaction-tag ${transaction.category === "Income" ? "tag-income" : ""}`}>{transaction.category}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <footer className="page-footer"><span>MAKE SENSE OF EVERY SHILLING.</span><span>DEMO ENVIRONMENT <span className="footer-dot" /> NO REAL FINANCIAL DATA</span></footer>
                </>
              )}

              {page === "Transactions" && (
                <section className="subpage">
                  <div className="eyebrow"><span className="eyebrow-dot" /> EVERY SHILLING HAS A STORY</div>
                  <div className="subpage-heading"><div><h1>The paper trail<span>.</span></h1><p>Every transaction, in one place. Nothing hiding between the lines.</p></div><button className="primary-button" onClick={() => goTo("Import")}><FileUp size={16} /> Import statement <ArrowUpRight size={15} /></button></div>
                  <div className="transactions-summary"><div><span>TRANSACTIONS SHOWN</span><strong>{visibleTransactions.length.toString().padStart(2, "0")}</strong></div><div><span>MONEY IN · DEMO</span><strong>{money(45000)}</strong></div><div><span>MONEY OUT · DEMO</span><strong>{money(3860)}</strong></div></div>
                  <div className="panel full-transactions">
                    <div className="transaction-tools"><label className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a merchant, category..." /><kbd> / </kbd></label><button className="filter-button" onClick={() => setSearch("")}><Settings2 size={15} /> Clear search</button></div>
                    <div className="transaction-list">
                      {visibleTransactions.map((transaction) => <div className="transaction-row" key={transaction.id}><div className={`merchant-avatar avatar-${transaction.color}`}>{transaction.icon}</div><div className="transaction-name"><strong>{transaction.merchant}</strong><span>{transaction.detail}</span></div><div className="transaction-date">{transaction.date}</div><div className={`transaction-amount ${transaction.amount > 0 ? "amount-in" : ""}`}>{transaction.amount > 0 ? "+" : "−"}{money(Math.abs(transaction.amount))}</div><div className={`transaction-tag ${transaction.category === "Income" ? "tag-income" : ""}`}>{transaction.category}</div></div>)}
                      {visibleTransactions.length === 0 && <div className="empty-state"><Search size={22} /><strong>No matching transactions</strong><span>Try a different merchant or category.</span></div>}
                    </div>
                    <div className="demo-table-note"><ShieldCheck size={15} /> Sample transactions only. Your own data will appear after we connect the database and import pipeline.</div>
                  </div>
                </section>
              )}

              {page === "Insights" && (
                <section className="subpage">
                  <div className="eyebrow"><span className="eyebrow-dot" /> PATTERNS WORTH NOTICING</div>
                  <div className="subpage-heading"><div><h1>Read between<br />the numbers<span>.</span></h1><p>Not financial advice. Just a clearer view of your habits, based on your data.</p></div><div className="insights-stamp"><Fingerprint size={25} /><span>YOUR PATTERNS<br />YOUR PERSPECTIVE</span></div></div>
                  <div className="insights-cards">
                    <article className="insight-feature"><div className="insight-top"><div className="insight-symbol"><Sparkles size={18} /></div><span>OBSERVATION 001 · DEMO</span></div><div className="insight-kicker">THE MONTHLY PICTURE</div><h2>You kept about half of what came in.</h2><p>In this sample dataset, money coming in exceeds recorded spending. The difference is a useful starting point for understanding your cash flow.</p><div className="feature-stat"><strong>50.1%</strong><span>Illustrative savings rate</span></div></article>
                    <article className="insight-small"><div className="insight-icon-box"><ArrowDownRight size={19} /></div><SectionLabel>SPENDING RHYTHM</SectionLabel><h3>Look for the repeaters.</h3><p>Recurring small purchases can add up. We'll identify patterns once we have enough real transactions to support them.</p><span className="insight-number">PATTERN 02</span></article>
                    <article className="insight-small"><div className="insight-icon-box"><Activity size={19} /></div><SectionLabel>CATEGORY SHIFTS</SectionLabel><h3>Compare like with like.</h3><p>Comparing equivalent periods helps distinguish a genuine change from a one-off expense.</p><span className="insight-number">PATTERN 03</span></article>
                  </div>
                  <div className="honesty-note"><CircleHelp size={17} /><div><strong>We believe insights should be explainable.</strong><p>These are design examples using mock figures, not conclusions about your finances. Real insights will show the transactions and calculations behind every claim.</p></div></div>
                </section>
              )}

              {page === "Import" && (
                <section className="subpage import-subpage">
                  <div className="eyebrow"><span className="eyebrow-dot" /> FROM RAW DATA TO REAL CLARITY</div>
                  <div className="subpage-heading"><div><h1>Bring your<br />money into focus<span>.</span></h1><p>Start with a statement. We'll help turn rows of transactions into something you can understand.</p></div><div className="import-step-count"><span>01</span><i /><span>02</span><i /><span>03</span></div></div>
                  <div className="import-workspace">
                    <div className="import-main">
                      <div className="import-step-label"><span>STEP 01</span><span>YOUR SOURCE FILE</span></div>
                      <h2>Drop the numbers.<br /><span>Find the meaning.</span></h2>
                      <p>Choose a CSV statement exported from your bank or financial app. You will review and confirm the transactions before anything is saved.</p>
                      <input ref={fileInput} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                      <button className={`dropzone ${selectedFile ? "dropzone-selected" : ""}`} onClick={() => fileInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.name.toLowerCase().endsWith(".csv")) setSelectedFile(file); }}>
                        <div className="dropzone-icon">{selectedFile ? <Check size={23} /> : <FileUp size={23} />}</div>
                        <strong>{selectedFile ? selectedFile.name : "Choose a statement to get started"}</strong>
                        <span>{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB · Selected locally` : "Drag a CSV here, or browse your files"}</span>
                        <span className="file-type-label">CSV FILES ONLY <i /> MAX SIZE WILL BE CHECKED ON UPLOAD</span>
                      </button>
                      {selectedFile && <div className="selected-file-note"><Check size={15} /><span>File selected. The parsing and review service will be connected in the next build stage.</span><button onClick={() => { setSelectedFile(null); if (fileInput.current) fileInput.current.value = ""; }} aria-label="Remove selected file"><X size={15} /></button></div>}
                      <div className="import-assurances"><span><ShieldCheck size={16} /> Review before saving</span><span><Fingerprint size={16} /> Duplicate-aware imports</span></div>
                      <button className="primary-button import-continue" disabled={!selectedFile} onClick={() => alert("File selection works. CSV parsing, column mapping, duplicate detection, and safe import will be implemented next.")}>Continue to preview <ArrowUpRight size={15} /></button>
                    </div>
                    <aside className="import-aside"><div className="import-aside-index">A NOTE ON YOUR DATA</div><div className="import-aside-mark"><ShieldCheck size={22} /></div><h3>Your statement is yours.</h3><p>We won't silently import a file. The intended workflow gives you a preview, explains rows it can't read, and flags possible duplicates before you commit.</p><div className="import-aside-line" /><span>NO SURPRISES. NO SILENT IMPORTS.</span></aside>
                  </div>
                  <div className="import-bottom-note"><Lightbulb size={16} /><span>Tip: export your statement as CSV from your provider. Avoid uploading files containing passwords or PINs.</span></div>
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
