import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Paste your deployed Apps Script Web App URL here:
const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwnQqDBryZZpJGgIVFwzrRm8rdjkQ8ZdRjilQ_wGLqhm3JCE7UMTlPkv_DdpVgQfcYC/exec";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  // Handles "2025-08-28" and "28/08/2025" etc.
  try {
    if (str.includes("-")) return parseISO(str);
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`);
  } catch { return null; }
}

function pct(yes, total) {
  if (!total) return 0;
  return Math.round((yes / total) * 100);
}

// ─── PRESET RANGES ───────────────────────────────────────────────────────────
function getRange(preset, custom) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "yesterday":
      return { from: startOfDay(subDays(today, 1)), to: endOfDay(subDays(today, 1)) };
    case "last7":
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case "custom":
      return {
        from: custom.from ? startOfDay(new Date(custom.from)) : null,
        to:   custom.to   ? endOfDay(new Date(custom.to))     : null,
      };
    default:
      return { from: null, to: null };
  }
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid var(--border)`,
      borderTop: `3px solid ${color}`,
      borderRadius: 10,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function Badge({ ok }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      background: ok ? "#16a34a22" : "#ef444422",
      color: ok ? "var(--ok)" : "var(--breach)",
      border: `1px solid ${ok ? "#16a34a55" : "#ef444455"}`,
    }}>
      {ok ? "✓ OK" : "✗ BREACH"}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [raw, setRaw]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Filters
  const [preset, setPreset]       = useState("last7");
  const [custom, setCustom]       = useState({ from: "", to: "" });
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | yes | no

  // Fetch
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(APPS_SCRIPT_URL);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Unknown error");
        setRaw(json.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Unique area types for filter dropdown
  const areaTypes = useMemo(() => {
    const s = new Set(raw.map(r => r.areaType).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [raw]);

  // Apply filters
  const filtered = useMemo(() => {
    const range = getRange(preset, custom);
    return raw.filter(row => {
      const d = parseDate(row.date);
      if (range.from && range.to && d) {
        if (!isWithinInterval(d, { start: range.from, end: range.to })) return false;
      }
      if (areaFilter !== "all" && row.areaType !== areaFilter) return false;
      if (statusFilter !== "all" && row.checkedStatus !== statusFilter) return false;
      return true;
    });
  }, [raw, preset, custom, areaFilter, statusFilter]);

  // KPIs
  const totalChecks = filtered.length;
  const yesCount    = filtered.filter(r => r.checkedStatus === "yes").length;
  const noCount     = filtered.filter(r => r.checkedStatus === "no").length;
  const compliance  = pct(yesCount, totalChecks);

  // Breaches
  const breaches = filtered.filter(r => r.checkedStatus === "no");

  // Chart: compliance % per area
  const chartData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.areaType) return;
      if (!map[r.areaType]) map[r.areaType] = { yes: 0, total: 0 };
      map[r.areaType].total++;
      if (r.checkedStatus === "yes") map[r.areaType].yes++;
    });
    return Object.entries(map).map(([area, { yes, total }]) => ({
      area,
      compliance: pct(yes, total),
    }));
  }, [filtered]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "0 0 60px" }}>
      {/* HEADER */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "24px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "var(--bg)",
        zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
            Quality Assurance
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Compliance Dashboard
          </h1>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          ↻ Refresh
        </button>
      </header>

      <main style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── FILTERS ── */}
        <section style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 32,
        }}>
          {/* Date Preset */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Date Range</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "today",     l: "Today" },
                { v: "yesterday", l: "Yesterday" },
                { v: "last7",     l: "Last 7 Days" },
                { v: "all",       l: "All Time" },
                { v: "custom",    l: "Custom" },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setPreset(v)}
                  style={presetBtn(preset === v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Custom dates */}
          {preset === "custom" && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>From</label>
                <input type="date" value={custom.from}
                  onChange={e => setCustom(p => ({ ...p, from: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>To</label>
                <input type="date" value={custom.to}
                  onChange={e => setCustom(p => ({ ...p, to: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>
          )}

          {/* Area Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Area Type</label>
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={inputStyle}>
              {areaTypes.map(a => <option key={a} value={a}>{a === "all" ? "All Areas" : a}</option>)}
            </select>
          </div>

          {/* Checked Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Checked Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="all">All</option>
              <option value="yes">✓ OK (Yes)</option>
              <option value="no">✗ Not OK (No)</option>
            </select>
          </div>
        </section>

        {/* ── STATE ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Fetching data from Google Sheets…
          </div>
        )}

        {error && (
          <div style={{
            background: "#ef444415", border: "1px solid #ef444440",
            borderRadius: 10, padding: 24, color: "var(--breach)", marginBottom: 32,
          }}>
            <strong>Error loading data:</strong> {error}
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
              Make sure NEXT_PUBLIC_APPS_SCRIPT_URL is set and the Apps Script is deployed as a public Web App.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── KPI CARDS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <KpiCard label="Compliance Rate"   value={`${compliance}%`} sub={`${yesCount} OK of ${totalChecks}`}  color="var(--ok)" />
              <KpiCard label="Total Checks"      value={totalChecks}      sub="in selected range"                    color="var(--blue)" />
              <KpiCard label="Passed (Yes / OK)" value={yesCount}         sub="all checks marked Yes"               color="var(--ok)" />
              <KpiCard label="Breaches (No)"     value={noCount}          sub="checks marked Not OK"                color="var(--breach)" />
            </div>

            {/* ── CHART ── */}
            {chartData.length > 0 && (
              <section style={cardStyle}>
                <h2 style={sectionTitle}>Compliance % by Area Type</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="area" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 12 }} unit="%" />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                      labelStyle={{ color: "var(--text)" }}
                      formatter={(v) => [`${v}%`, "Compliance"]}
                    />
                    <Bar dataKey="compliance" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.compliance >= 80 ? "var(--ok)" : entry.compliance >= 50 ? "var(--accent)" : "var(--breach)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  🟢 ≥80% &nbsp;🟡 50–79% &nbsp;🔴 &lt;50%
                </p>
              </section>
            )}

            {/* ── CRITICAL BREACH TABLE ── */}
            <section style={{ ...cardStyle, marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={sectionTitle}>
                  Critical Breaches
                  <span style={{
                    marginLeft: 10, fontSize: 13, fontWeight: 700,
                    background: "#ef444422", color: "var(--breach)",
                    padding: "2px 10px", borderRadius: 99, border: "1px solid #ef444455"
                  }}>{breaches.length}</span>
                </h2>
              </div>

              {breaches.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "48px 0",
                  color: "var(--ok)", fontSize: 15
                }}>
                  ✓ No breaches in the selected range
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Date", "Area Type", "Checklist Item", "Status", "Remarks"].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {breaches.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: "1px solid var(--border)",
                          background: i % 2 === 0 ? "#ef444408" : "transparent",
                          transition: "background 0.15s",
                        }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                              {row.date}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              background: "var(--border)", padding: "2px 8px",
                              borderRadius: 4, fontSize: 11, fontWeight: 600
                            }}>{row.areaType}</span>
                          </td>
                          <td style={{ ...tdStyle, maxWidth: 380, lineHeight: 1.5 }}>
                            {row.checklistTitle}
                          </td>
                          <td style={tdStyle}><Badge ok={false} /></td>
                          <td style={{ ...tdStyle, color: row.remarks ? "var(--accent)" : "var(--muted)", fontStyle: row.remarks ? "normal" : "italic" }}>
                            {row.remarks || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── FULL CHECKLIST TABLE ── */}
            <section style={{ ...cardStyle, marginTop: 24 }}>
              <h2 style={{ ...sectionTitle, marginBottom: 20 }}>
                All Checks
                <span style={{
                  marginLeft: 10, fontSize: 13, fontWeight: 700,
                  background: "#3b82f622", color: "var(--blue)",
                  padding: "2px 10px", borderRadius: 99, border: "1px solid #3b82f655"
                }}>{filtered.length}</span>
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Area", "Checklist Item", "Status", "Remarks"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const isOk = row.checkedStatus === "yes";
                      return (
                        <tr key={i} style={{
                          borderBottom: "1px solid var(--border)",
                          background: !isOk ? "#ef444408" : "transparent",
                        }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted)", fontSize: 12 }}>
                              {row.date}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              background: "var(--border)", padding: "2px 8px",
                              borderRadius: 4, fontSize: 11, fontWeight: 600
                            }}>{row.areaType}</span>
                          </td>
                          <td style={{ ...tdStyle, maxWidth: 380, lineHeight: 1.5 }}>{row.checklistTitle}</td>
                          <td style={tdStyle}><Badge ok={isOk} /></td>
                          <td style={{ ...tdStyle, color: row.remarks ? "var(--text)" : "var(--muted)", fontStyle: row.remarks ? "normal" : "italic" }}>
                            {row.remarks || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 11,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
};

const inputStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "'Syne', sans-serif",
  cursor: "pointer",
  outline: "none",
};

const presetBtn = (active) => ({
  padding: "7px 14px",
  borderRadius: 6,
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "#f59e0b22" : "var(--bg)",
  color: active ? "var(--accent)" : "var(--muted)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "'Syne', sans-serif",
  fontWeight: active ? 700 : 400,
  transition: "all 0.15s",
});

const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "24px",
};

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  marginBottom: 0,
  display: "flex",
  alignItems: "center",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 12px",
  verticalAlign: "top",
};
