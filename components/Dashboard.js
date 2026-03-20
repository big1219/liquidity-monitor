import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, BarChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

var C = {
  bg: "#0a0e17", card: "#111827", border: "#1e293b",
  accent: "#00d4aa", accentD: "#00d4aa33",
  danger: "#ff4757", dangerD: "#ff475722",
  warn: "#ffa502", purple: "#a78bfa",
  cyan: "#22d3ee", orange: "#f97316",
  t1: "#f1f5f9", t2: "#94a3b8", t3: "#475569", grid: "#1e293b"
};

function Tip(p) {
  if (!p.active || !p.payload || !p.payload.length) return null;
  return (
    <div style={{ background: "#1a1f2e", border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: C.t2, fontSize: 11, marginBottom: 6 }}>{p.label}</div>
      {p.payload.map(function(e, i) {
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
            <span style={{ color: C.t2, fontSize: 12, minWidth: 70 }}>{e.name}</span>
            <span style={{ color: C.t1, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
              {typeof e.value === "number" ? e.value.toLocaleString() : e.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  var ds = useState([]); var data = ds[0]; var setData = ds[1];
  var ls = useState(true); var loading = ls[0]; var setLoading = ls[1];
  var ss = useState("loading"); var status = ss[0]; var setStatus = ss[1];
  var us = useState(null); var lastUpdate = us[0]; var setLastUpdate = us[1];
  var es = useState(null); var error = es[0]; var setError = es[1];
  var ts = useState("overview"); var tab = ts[0]; var setTab = ts[1];
  var rs = useState("ALL"); var range = rs[0]; var setRange = rs[1];

  var fetchData = useCallback(function() {
    setLoading(true);
    setError(null);
    return fetch("/api/fred").then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(json) {
      if (json.success && json.data && json.data.length > 0) {
        setData(json.data);
        setStatus("live");
        setLastUpdate(new Date().toLocaleString("ko-KR"));
      } else {
        throw new Error("Empty data");
      }
    }).catch(function(e) {
      setError(e.message);
      setStatus("error");
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  useEffect(function() { fetchData(); }, [fetchData]);

  var filtered = useMemo(function() {
    if (!data.length) return [];
    if (range === "ALL") return data;
    var last = new Date(data[data.length - 1].date);
    var months = range === "3M" ? 3 : range === "6M" ? 6 : 12;
    var start = new Date(last);
    start.setMonth(start.getMonth() - months);
    return data.filter(function(d) { return new Date(d.date) >= start; });
  }, [data, range]);

  var latest = data.length ? data[data.length - 1] : {};
  var prev = data.length > 4 ? data[data.length - 5] : latest;

  var signal = useMemo(function() {
    if (!data.length) return null;
    var L = latest; var P = prev; var total = 0; var factors = [];
    var nlC = (L.netLiquidity || 0) - (P.netLiquidity || 0);
    var nlS = nlC > 50 ? 2 : nlC > 10 ? 1 : nlC < -50 ? -2 : nlC < -10 ? -1 : 0;
    factors.push({ name: "순유동성", score: nlS, weight: 25, detail: (nlC > 0 ? "+" : "") + nlC + "B" });
    total += nlS * 25;
    var tD = (L.tga || 0) - (P.tga || 0);
    var tS = 0;
    if (tD < -30 && L.tga < 400) tS = 2; else if (tD < -10) tS = 1;
    else if (tD > 30 && L.tga > 800) tS = -2; else if (tD > 10) tS = -1;
    factors.push({ name: "TGA", score: tS, weight: 20, detail: L.tga + "B" });
    total += tS * 20;
    var sp = (L.sofr || 3.62) - 3.65;
    var sS = sp < -0.05 ? 2 : sp < 0 ? 1 : sp > 0.1 ? -2 : sp > 0 ? -1 : 0;
    factors.push({ name: "SOFR-IORB", score: sS, weight: 15, detail: (sp * 100).toFixed(0) + "bp" });
    total += sS * 15;
    var dC = (L.dxy || 99) - (P.dxy || 100);
    var dS = dC < -2 ? 2 : dC < -0.5 ? 1 : dC > 2 ? -2 : dC > 0.5 ? -1 : 0;
    factors.push({ name: "DXY", score: dS, weight: 10, detail: String(L.dxy || 99) });
    total += dS * 10;
    var mS = (L.globalM2 || 98) > (P.globalM2 || 97) ? 1 : -1;
    factors.push({ name: "글로벌M2", score: mS, weight: 15, detail: (L.globalM2 || 98) + "T" });
    total += mS * 15;
    factors.push({ name: "스테이블코인", score: 1, weight: 10, detail: "$310B+" });
    total += 10;
    var rS = (L.rrp || 0) < 10 ? -1 : 0;
    factors.push({ name: "RRP", score: rS, weight: 5, detail: "$" + (L.rrp || 0) + "B" });
    total += rS * 5;
    var norm = Math.round(total / 2);
    var label, color;
    if (norm >= 50) { label = "강력 매수"; color = C.accent; }
    else if (norm >= 20) { label = "매수"; color = "#4ade80"; }
    else if (norm >= -20) { label = "관망"; color = C.t2; }
    else if (norm >= -50) { label = "매도"; color = C.warn; }
    else { label = "강력 매도"; color = C.danger; }
    return { score: norm, label: label, color: color, factors: factors };
  }, [data, latest, prev]);

  if (loading && !data.length) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.accent }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◉</div>
          <div style={{ fontSize: 14, color: C.t2 }}>FRED에서 실시간 데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "'Inter', sans-serif", padding: "20px 20px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}><span style={{ color: C.accent }}>NET</span> LIQUIDITY MONITOR</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: status === "live" ? C.accentD : C.dangerD, color: status === "live" ? C.accent : C.danger }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                {status === "live" ? "LIVE" : "ERROR"}
              </span>
            </div>
            <p style={{ color: C.t2, fontSize: 12, margin: 0 }}>
              실시간 FRED API | Net Liquidity = WALCL - TGA - RRP
              {lastUpdate && <span style={{ color: C.t3, marginLeft: 8 }}>업데이트: {lastUpdate}</span>}
            </p>
            {error && <p style={{ color: C.danger, fontSize: 12, margin: "4px 0 0" }}>⚠ {error}</p>}
          </div>
          <button onClick={fetchData} disabled={loading} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: loading ? C.border : C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "로딩..." : "⟳ 새로고침"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["overview", "종합"], ["signal", "매매시그널"], ["macro", "매크로"]].map(function(t) {
            return <button key={t[0]} onClick={function() { setTab(t[0]); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t[0] ? C.accentD : "transparent", color: tab === t[0] ? C.accent : C.t2 }}>{t[1]}</button>;
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            { l: "순유동성", v: latest.netLiquidity, u: "B$", ch: latest.weeklyChange },
            { l: "TGA", v: latest.tga, u: "B$", ch: latest.tgaChange },
            { l: "Fed MBS", v: latest.mbs, u: "B$" },
            { l: "SOFR", v: latest.sofr, u: "%" },
            { l: "DXY", v: latest.dxy, u: "" }
          ].map(function(m, i) {
            return (
              <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ color: C.t2, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
                <div style={{ color: C.t1, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {m.v != null ? m.v.toLocaleString() : "—"}<span style={{ fontSize: 12, color: C.t3, marginLeft: 3 }}>{m.u}</span>
                </div>
                {m.ch != null && <div style={{ fontSize: 12, color: m.ch >= 0 ? C.accent : C.danger, fontWeight: 600, marginTop: 2, fontFamily: "monospace" }}>{m.ch >= 0 ? "+" : ""}{m.ch} 주간</div>}
              </div>
            );
          })}
          {signal && (
            <div onClick={function() { setTab("signal"); }} style={{ background: C.card, border: "1px solid " + signal.color + "44", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
              <div style={{ color: C.t2, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>매매 시그널</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: signal.color, fontFamily: "'JetBrains Mono', monospace" }}>{signal.score}</span>
                <span style={{ padding: "2px 8px", borderRadius: 6, background: signal.color + "22", color: signal.color, fontSize: 12, fontWeight: 700 }}>{signal.label}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["3M", "6M", "1Y", "ALL"].map(function(r) {
            return <button key={r} onClick={function() { setRange(r); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: range === r ? C.accent : C.card, color: range === r ? C.bg : C.t2 }}>{r}</button>;
          })}
        </div>

        {tab === "overview" && filtered.length > 0 && (
          <>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>순유동성 추이 (실시간)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={filtered}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: C.t3, fontSize: 10 }} tickFormatter={function(v) { return (v || "").substring(2, 7); }} interval={Math.max(1, Math.floor(filtered.length / 10))} />
                  <YAxis yAxisId="l" tick={{ fill: C.t3, fontSize: 10 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fill: C.t3, fontSize: 10 }} />
                  <Tooltip content={Tip} />
                  <ReferenceLine yAxisId="r" y={800} stroke={C.danger} strokeDasharray="5 5" />
                  <Area yAxisId="l" type="monotone" dataKey="netLiquidity" name="Net Liquidity" stroke={C.accent} fill={C.accentD} strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="tga" name="TGA" stroke={C.warn} strokeWidth={1.5} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="mbs" name="MBS" stroke={C.purple} strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>주간 변동</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={filtered.slice(-26)}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: C.t3, fontSize: 9 }} tickFormatter={function(v) { return (v || "").substring(5, 10); }} interval={2} />
                  <YAxis tick={{ fill: C.t3, fontSize: 10 }} />
                  <Tooltip content={Tip} />
                  <Bar dataKey="weeklyChange" name="주간변동" radius={[2, 2, 0, 0]} fill={C.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === "signal" && signal && (
          <>
            <div style={{ background: C.card, border: "2px solid " + signal.color + "66", borderRadius: 20, padding: 32, marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.t2, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>유동성 복합 매매 시그널</div>
              <div style={{ fontSize: 64, fontWeight: 800, color: signal.color, fontFamily: "'JetBrains Mono', monospace" }}>{signal.score}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: signal.color, marginTop: 8 }}>{signal.label}</div>
              <div style={{ marginTop: 16, position: "relative", height: 32, background: "linear-gradient(to right, #ff4757, #ffa502, #94a3b8, #4ade80, #00d4aa)", borderRadius: 16, maxWidth: 500, margin: "16px auto 0" }}>
                <div style={{ position: "absolute", left: Math.min(98, Math.max(2, (signal.score + 100) / 2)) + "%", top: 0, transform: "translateX(-50%)", width: 4, height: 32, background: "#fff", borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 500, margin: "6px auto 0", fontSize: 10, color: C.t3 }}>
                <span>-100 강력매도</span><span>0 중립</span><span>+100 강력매수</span>
              </div>
            </div>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>7개 지표 상세</h3>
              {signal.factors.map(function(f, i) {
                var bc = f.score >= 1 ? C.accent : f.score <= -1 ? C.danger : C.t2;
                return (
                  <div key={i} style={{ padding: "12px 16px", background: C.bg, borderRadius: 10, border: "1px solid " + C.border, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.name}</span>
                        <span style={{ fontSize: 10, color: C.t3, background: C.card, padding: "2px 6px", borderRadius: 4 }}>{f.weight}%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.t2, fontFamily: "monospace" }}>{f.detail}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: bc + "22", color: bc }}>{f.score > 0 ? "+" : ""}{f.score}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 16, background: C.card, borderRadius: 12, border: "1px solid " + C.danger + "33", fontSize: 12, color: C.danger, lineHeight: 1.7 }}>
              ⚠️ 이 시그널은 거시 유동성 조건만 반영하며 투자 조언이 아닙니다.
            </div>
          </>
        )}

        {tab === "macro" && filtered.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { l: "SOFR", v: latest.sofr, u: "%" }, { l: "EFFR", v: latest.effr, u: "%" },
                { l: "DXY", v: latest.dxy, u: "" }, { l: "10Y", v: latest.yield10y, u: "%" },
                { l: "2Y", v: latest.yield2y, u: "%" }, { l: "M2", v: latest.globalM2, u: "T$" },
                { l: "Reserves", v: latest.reserves, u: "B$" }, { l: "RRP", v: latest.rrp, u: "B$" }
              ].map(function(m, i) {
                return (
                  <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ color: C.t3, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
                    <div style={{ color: C.t1, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                      {m.v != null ? m.v.toLocaleString() : "—"}<span style={{ fontSize: 11, color: C.t3, marginLeft: 3 }}>{m.u}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>SOFR & DXY</h2>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={filtered}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: C.t3, fontSize: 10 }} tickFormatter={function(v) { return (v || "").substring(2, 7); }} interval={Math.max(1, Math.floor(filtered.length / 10))} />
                  <YAxis yAxisId="l" tick={{ fill: C.t3, fontSize: 10 }} domain={["auto", "auto"]} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fill: C.t3, fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip content={Tip} />
                  <ReferenceLine yAxisId="l" y={3.65} stroke={C.danger} strokeDasharray="5 5" />
                  <Line yAxisId="l" type="monotone" dataKey="sofr" name="SOFR" stroke={C.cyan} strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="dxy" name="DXY" stroke={C.orange} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div style={{ marginTop: 32, padding: 20, background: C.card, borderRadius: 12, border: "1px solid " + C.border, fontSize: 12, color: C.t3 }}>
          <strong style={{ color: C.t2 }}>데이터:</strong> FRED API 11개 시리즈 | 30분 캐시
          <br /><strong style={{ color: C.warn }}>⚠️</strong> 교육/참고 목적이며 투자 조언이 아닙니다.
        </div>
      </div>
    </div>
  );
}
