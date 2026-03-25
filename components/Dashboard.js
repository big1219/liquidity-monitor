import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, BarChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

var C = {
  bg: "#0a0e17", card: "#111827", border: "#1e293b",
  accent: "#00d4aa", accentD: "#00d4aa33",
  danger: "#ff4757", dangerD: "#ff475722",
  warn: "#ffa502", warnD: "#ffa50222",
  purple: "#a78bfa", purpleD: "#a78bfa22",
  cyan: "#22d3ee", orange: "#f97316",
  blue: "#3b82f6", blueD: "#3b82f622",
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

function generateAlerts(data) {
  if (!data || data.length < 5) return [];
  var alerts = [];
  var L = data[data.length - 1];
  var P1 = data[data.length - 2] || L;
  var P4 = data.length > 4 ? data[data.length - 5] : L;

  var tgaW = L.tga - P4.tga;
  if (tgaW > 50) alerts.push({ type: "danger", icon: "▼", title: "TGA 급등 경고", detail: "TGA가 4주간 $" + Math.abs(tgaW) + "B 상승 → 대규모 유동성 흡수 진행 중. 국채 발행 또는 세금 수납 증가.", impact: "주식/코인 하방 압력", time: L.date });
  if (tgaW < -50) alerts.push({ type: "positive", icon: "▲", title: "TGA 급락 — 유동성 공급", detail: "TGA가 4주간 $" + Math.abs(tgaW) + "B 하락 → 정부 지출 확대로 시중에 유동성 유입.", impact: "주식/코인 상방 압력", time: L.date });
  if (L.tga > 800) alerts.push({ type: "danger", icon: "⚠", title: "TGA $800B 위험 임계 초과", detail: "현재 TGA $" + L.tga + "B — $800B 이상에서 SOFR 상승과 결합 시 이중 유동성 압착(double squeeze) 위험.", impact: "레포시장 스트레스 주의", time: L.date });
  if (L.tga < 200) alerts.push({ type: "positive", icon: "✓", title: "TGA 저잔고 — 유동성 공급 구간", detail: "현재 TGA $" + L.tga + "B — 정부 잔고 부족으로 시장에 유동성이 풍부한 상태.", impact: "위험자산 우호 환경", time: L.date });

  if (L.sofr > 3.65) alerts.push({ type: "danger", icon: "▼", title: "SOFR > IORB — 은행 유동성 부족", detail: "SOFR " + L.sofr + "% > IORB 3.65% → 은행들이 유동성 확보를 위해 프리미엄 지불 중. 자금시장 스트레스 신호.", impact: "단기 자금시장 긴축", time: L.date });
  if (L.sofr < 3.55) alerts.push({ type: "positive", icon: "▲", title: "SOFR 하락 — 자금시장 여유", detail: "SOFR " + L.sofr + "% — IORB 대비 충분히 낮아 은행간 유동성이 풍부한 상태.", impact: "위험자산 우호", time: L.date });

  var nlW = L.netLiquidity - P4.netLiquidity;
  if (nlW > 100) alerts.push({ type: "positive", icon: "▲", title: "순유동성 급증 +" + nlW + "B", detail: "4주간 순유동성이 $" + nlW + "B 증가 — Fed 자산 안정 + TGA 하락 또는 RRP 감소에 의한 것으로 추정.", impact: "강한 매수 신호", time: L.date });
  if (nlW < -100) alerts.push({ type: "danger", icon: "▼", title: "순유동성 급감 " + nlW + "B", detail: "4주간 순유동성이 $" + Math.abs(nlW) + "B 감소 — TGA 재건 또는 Fed 자산 축소에 의한 것으로 추정.", impact: "강한 매도 신호", time: L.date });

  if (L.rrp < 5) alerts.push({ type: "warn", icon: "⚠", title: "RRP 완전 고갈 ($" + L.rrp + "B)", detail: "역레포 잔고가 거의 $0 — 유동성 완충 역할 불가. TGA 변동이 지급준비금에 직접 충격.", impact: "시장 변동성 확대 가능", time: L.date });

  if (L.dxy > 110) alerts.push({ type: "danger", icon: "▼", title: "달러 초강세 (DXY " + L.dxy + ")", detail: "DXY " + L.dxy + " — 글로벌 자금이 달러로 집중. 신흥국/위험자산/크립토에서 자금 유출 압력.", impact: "글로벌 위험자산 약세", time: L.date });
  if (L.dxy < 100) alerts.push({ type: "positive", icon: "▲", title: "달러 약세 전환 (DXY " + L.dxy + ")", detail: "DXY " + L.dxy + " — 글로벌 유동성 완화 신호. 위험자산과 크립토에 우호적 환경.", impact: "위험자산 상방 압력", time: L.date });

  var mbsW = L.mbs - P4.mbs;
  if (mbsW < -20) alerts.push({ type: "warn", icon: "↓", title: "MBS 런오프 가속 (" + mbsW + "B/4주)", detail: "Fed MBS 보유량이 4주간 $" + Math.abs(mbsW) + "B 감소 — 모기지 시장 유동성 축소. T-bill로 전환 중.", impact: "모기지 금리 상방 압력", time: L.date });

  if (L.yield10y > 4.5) alerts.push({ type: "warn", icon: "⚠", title: "10Y 금리 " + L.yield10y + "% — 고금리 지속", detail: "장기 국채 금리가 4.5% 이상으로 유지 중. 성장주 밸류에이션 압박 및 자금 채권 이동 가능.", impact: "성장주/크립토 약세 요인", time: L.date });

  if (alerts.length === 0) alerts.push({ type: "neutral", icon: "●", title: "특이사항 없음", detail: "모든 유동성 지표가 정상 범위 내에서 움직이고 있습니다.", impact: "기존 포지션 유지", time: L.date });

  return alerts.sort(function(a, b) { var o = { danger: 0, warn: 1, positive: 2, neutral: 3 }; return (o[a.type] || 3) - (o[b.type] || 3); });
}

var FOMC_2026 = [
  { date: "2026-01-27", label: "1월", done: true, result: "동결" },
  { date: "2026-03-17", label: "3월 SEP", done: true, result: "동결" },
  { date: "2026-05-05", label: "5월", done: false },
  { date: "2026-06-16", label: "6월 SEP", done: false },
  { date: "2026-07-28", label: "7월", done: false },
  { date: "2026-09-15", label: "9월 SEP", done: false },
  { date: "2026-10-27", label: "10월", done: false },
  { date: "2026-12-15", label: "12월 SEP", done: false },
];

export default function Dashboard() {
  var ds = useState([]); var data = ds[0]; var setData = ds[1];
  var ls = useState(true); var loading = ls[0]; var setLoading = ls[1];
  var ss = useState("loading"); var status = ss[0]; var setStatus = ss[1];
  var us = useState(null); var lastUpdate = us[0]; var setLastUpdate = us[1];
  var es = useState(null); var error = es[0]; var setError = es[1];
  var ts = useState("overview"); var tab = ts[0]; var setTab = ts[1];
  var rs = useState("ALL"); var range = rs[0]; var setRange = rs[1];
  var rts = useState([]); var realtime = rts[0]; var setRealtime = rts[1];
  var rtts = useState(null); var rtTime = rtts[0]; var setRtTime = rtts[1];

  var fetchData = useCallback(function() {
    setLoading(true); setError(null);
    return fetch("/api/fred").then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(json) {
      if (json.success && json.data && json.data.length > 0) {
        setData(json.data); setStatus("live");
        setLastUpdate(new Date().toLocaleString("ko-KR"));
      } else { throw new Error("Empty data"); }
    }).catch(function(e) { setError(e.message); setStatus("error"); })
    .finally(function() { setLoading(false); });
  }, []);

  var rtls = useState(false); var rtLoading = rtls[0]; var setRtLoading = rtls[1];

  var fetchRealtime = useCallback(function() {
    setRtLoading(true);
    return fetch("/api/realtime").then(function(r) {
      if (!r.ok) throw new Error("RT " + r.status);
      return r.json();
    }).then(function(json) {
      if (json.success && json.data) {
        setRealtime(json.data);
        setRtTime(new Date().toLocaleString("ko-KR"));
      }
    }).catch(function() { /* silent fail for realtime */ })
    .finally(function() { setRtLoading(false); });
  }, []);

  var nws = useState([]); var news = nws[0]; var setNews = nws[1];
  var nls = useState(false); var newsLoading = nls[0]; var setNewsLoading = nls[1];

  var fetchNews = useCallback(function() {
    setNewsLoading(true);
    return fetch("/api/news").then(function(r) {
      if (!r.ok) throw new Error("News " + r.status);
      return r.json();
    }).then(function(json) {
      if (json.success && json.data) { setNews(json.data); }
    }).catch(function() { /* silent */ })
    .finally(function() { setNewsLoading(false); });
  }, []);

  useEffect(function() { fetchData(); fetchRealtime(); fetchNews(); }, [fetchData, fetchRealtime, fetchNews]);
  useEffect(function() {
    var timer = setInterval(fetchRealtime, 120000);
    return function() { clearInterval(timer); };
  }, [fetchRealtime]);

  var filtered = useMemo(function() {
    if (!data.length) return [];
    if (range === "ALL") return data;
    var last = new Date(data[data.length - 1].date);
    var months = range === "3M" ? 3 : range === "6M" ? 6 : 12;
    var start = new Date(last); start.setMonth(start.getMonth() - months);
    return data.filter(function(d) { return new Date(d.date) >= start; });
  }, [data, range]);

  var latest = data.length ? data[data.length - 1] : {};
  var prev = data.length > 4 ? data[data.length - 5] : latest;

  var alerts = useMemo(function() { return generateAlerts(data); }, [data]);

  var signal = useMemo(function() {
    if (!data.length) return null;
    var L = latest; var P = prev; var total = 0; var factors = [];
    var nlC = (L.netLiquidity || 0) - (P.netLiquidity || 0);
    var nlS = nlC > 50 ? 2 : nlC > 10 ? 1 : nlC < -50 ? -2 : nlC < -10 ? -1 : 0;
    factors.push({ name: "순유동성", score: nlS, weight: 25, detail: (nlC > 0 ? "+" : "") + nlC + "B" });
    total += nlS * 25;
    var tD = (L.tga || 0) - (P.tga || 0); var tS = 0;
    if (tD < -30 && L.tga < 400) tS = 2; else if (tD < -10) tS = 1;
    else if (tD > 30 && L.tga > 800) tS = -2; else if (tD > 10) tS = -1;
    factors.push({ name: "TGA", score: tS, weight: 20, detail: L.tga + "B" }); total += tS * 20;
    var sp = (L.sofr || 3.62) - 3.65;
    var sS = sp < -0.05 ? 2 : sp < 0 ? 1 : sp > 0.1 ? -2 : sp > 0 ? -1 : 0;
    factors.push({ name: "SOFR-IORB", score: sS, weight: 15, detail: (sp * 100).toFixed(0) + "bp" }); total += sS * 15;
    var dC = (L.dxy || 99) - (P.dxy || 100);
    var dS = dC < -2 ? 2 : dC < -0.5 ? 1 : dC > 2 ? -2 : dC > 0.5 ? -1 : 0;
    factors.push({ name: "DXY", score: dS, weight: 10, detail: String(L.dxy || 99) }); total += dS * 10;
    var mS = (L.globalM2 || 98) > (P.globalM2 || 97) ? 1 : -1;
    factors.push({ name: "글로벌M2", score: mS, weight: 15, detail: (L.globalM2 || 98) + "T" }); total += mS * 15;
    factors.push({ name: "스테이블코인", score: 1, weight: 10, detail: "$310B+" }); total += 10;
    var rS = (L.rrp || 0) < 10 ? -1 : 0;
    factors.push({ name: "RRP", score: rS, weight: 5, detail: "$" + (L.rrp || 0) + "B" }); total += rS * 5;
    var norm = Math.round(total / 2); var label, color;
    if (norm >= 50) { label = "강력 매수"; color = C.accent; }
    else if (norm >= 20) { label = "매수"; color = "#4ade80"; }
    else if (norm >= -20) { label = "관망"; color = C.t2; }
    else if (norm >= -50) { label = "매도"; color = C.warn; }
    else { label = "강력 매도"; color = C.danger; }
    return { score: norm, label: label, color: color, factors: factors };
  }, [data, latest, prev]);

  if (loading && !data.length) {
    return (<div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.accent }}><div style={{ fontSize: 32, marginBottom: 16 }}>◉</div>
      <div style={{ fontSize: 14, color: C.t2 }}>FRED 실시간 데이터 로딩 중...</div></div></div>);
  }

  var alertCount = alerts.filter(function(a) { return a.type === "danger"; }).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "'Inter', sans-serif", padding: "20px 20px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}><span style={{ color: C.accent }}>NET</span> LIQUIDITY MONITOR</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: status === "live" ? C.accentD : C.dangerD, color: status === "live" ? C.accent : C.danger }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />{status === "live" ? "LIVE" : "ERROR"}</span>
            </div>
            <p style={{ color: C.t2, fontSize: 12, margin: 0 }}>FRED 주간 + Yahoo Finance 실시간 | Net Liquidity = WALCL - TGA - RRP{lastUpdate && <span style={{ color: C.t3, marginLeft: 8 }}>FRED: {lastUpdate}</span>}{rtTime && <span style={{ color: C.accent, marginLeft: 8 }}>실시간: {rtTime}</span>}</p>
            {error && <p style={{ color: C.danger, fontSize: 12, margin: "4px 0 0" }}>⚠ {error}</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function() { fetchRealtime(); }} disabled={rtLoading} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid " + (rtLoading ? C.border : C.cyan), background: rtLoading ? C.border : "transparent", color: rtLoading ? C.t3 : C.cyan, fontSize: 12, fontWeight: 600, cursor: rtLoading ? "wait" : "pointer", transition: "all 0.3s" }}>{rtLoading ? "◌ 로딩..." : "⟳ 실시간"}</button>
            <button onClick={fetchData} disabled={loading} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: loading ? C.border : C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "로딩..." : "⟳ FRED"}</button>
          </div>
        </div>

        {/* Real-time Ticker Bar */}
        {realtime.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {realtime.map(function(q, i) {
              var isUp = q.change >= 0;
              var col = isUp ? C.accent : C.danger;
              return (<div key={i} style={{ minWidth: 120, padding: "10px 14px", background: C.card, border: "1px solid " + C.border, borderRadius: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.t2 }}>{q.name}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: q.marketState === "REGULAR" || q.marketState === "PRE" || q.marketState === "POST" ? C.accent : C.t3 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, fontFamily: "'JetBrains Mono', monospace" }}>
                  {q.name === "BTC" || q.name === "ETH" || q.name === "Gold" || q.name === "S&P500" ? q.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: col, fontFamily: "monospace" }}>
                  {isUp ? "+" : ""}{q.change} ({isUp ? "+" : ""}{q.changePercent}%)
                </div>
              </div>);
            })}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["overview", "종합"], ["signal", "매매시그널"], ["macro", "매크로"], ["forecast", "예측"], ["news", "뉴스/알림"]].map(function(t) {
            return <button key={t[0]} onClick={function() { setTab(t[0]); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t[0] ? C.accentD : "transparent", color: tab === t[0] ? C.accent : C.t2, position: "relative" }}>
              {t[1]}
              {t[0] === "news" && alertCount > 0 && <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: C.danger, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{alertCount}</span>}
            </button>;
          })}
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[{ l: "순유동성", v: latest.netLiquidity, u: "B$", ch: latest.weeklyChange },
            { l: "TGA", v: latest.tga, u: "B$", ch: latest.tgaChange },
            { l: "Fed MBS", v: latest.mbs, u: "B$" },
            { l: "SOFR", v: latest.sofr, u: "%" },
            { l: "VIX", v: latest.vix, u: "" }
          ].map(function(m, i) {
            return (<div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ color: C.t2, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
              <div style={{ color: C.t1, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{m.v != null ? m.v.toLocaleString() : "—"}<span style={{ fontSize: 12, color: C.t3, marginLeft: 3 }}>{m.u}</span></div>
              {m.ch != null && <div style={{ fontSize: 12, color: m.ch >= 0 ? C.accent : C.danger, fontWeight: 600, marginTop: 2, fontFamily: "monospace" }}>{m.ch >= 0 ? "+" : ""}{m.ch} 주간</div>}
            </div>);
          })}
          {signal && (<div onClick={function() { setTab("signal"); }} style={{ background: C.card, border: "1px solid " + signal.color + "44", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
            <div style={{ color: C.t2, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>매매 시그널</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: signal.color, fontFamily: "'JetBrains Mono', monospace" }}>{signal.score}</span>
              <span style={{ padding: "2px 8px", borderRadius: 6, background: signal.color + "22", color: signal.color, fontSize: 12, fontWeight: 700 }}>{signal.label}</span>
            </div>
          </div>)}
        </div>

        {/* Range */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["3M", "6M", "1Y", "ALL"].map(function(r) {
            return <button key={r} onClick={function() { setRange(r); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: range === r ? C.accent : C.card, color: range === r ? C.bg : C.t2 }}>{r}</button>;
          })}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && filtered.length > 0 && (<>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>순유동성 추이 (실시간)</h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={filtered}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: C.t3, fontSize: 10 }} tickFormatter={function(v) { return (v || "").substring(2, 7); }} interval={Math.max(1, Math.floor(filtered.length / 10))} />
                <YAxis yAxisId="l" tick={{ fill: C.t3, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: C.t3, fontSize: 10 }} />
                <Tooltip content={Tip} /><ReferenceLine yAxisId="r" y={800} stroke={C.danger} strokeDasharray="5 5" />
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
                <YAxis tick={{ fill: C.t3, fontSize: 10 }} /><Tooltip content={Tip} />
                <Bar dataKey="weeklyChange" name="주간변동" radius={[2, 2, 0, 0]} fill={C.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>)}

        {/* SIGNAL */}
        {tab === "signal" && signal && (<>
          <div style={{ background: C.card, border: "2px solid " + signal.color + "66", borderRadius: 20, padding: 32, marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: C.t2, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>유동성 복합 매매 시그널</div>
            <div style={{ fontSize: 64, fontWeight: 800, color: signal.color, fontFamily: "'JetBrains Mono', monospace" }}>{signal.score}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: signal.color, marginTop: 8 }}>{signal.label}</div>
            <div style={{ marginTop: 16, position: "relative", height: 32, background: "linear-gradient(to right, #ff4757, #ffa502, #94a3b8, #4ade80, #00d4aa)", borderRadius: 16, maxWidth: 500, margin: "16px auto 0" }}>
              <div style={{ position: "absolute", left: Math.min(98, Math.max(2, (signal.score + 100) / 2)) + "%", top: 0, transform: "translateX(-50%)", width: 4, height: 32, background: "#fff", borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 500, margin: "6px auto 0", fontSize: 10, color: C.t3 }}><span>-100 강력매도</span><span>0 중립</span><span>+100 강력매수</span></div>
          </div>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>7개 지표 상세</h3>
            {signal.factors.map(function(f, i) {
              var bc = f.score >= 1 ? C.accent : f.score <= -1 ? C.danger : C.t2;
              return (<div key={i} style={{ padding: "12px 16px", background: C.bg, borderRadius: 10, border: "1px solid " + C.border, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.name}</span><span style={{ fontSize: 10, color: C.t3, background: C.card, padding: "2px 6px", borderRadius: 4 }}>{f.weight}%</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: C.t2, fontFamily: "monospace" }}>{f.detail}</span><span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: bc + "22", color: bc }}>{f.score > 0 ? "+" : ""}{f.score}</span></div>
                </div></div>);
            })}
          </div>
          <div style={{ padding: 16, background: C.card, borderRadius: 12, border: "1px solid " + C.danger + "33", fontSize: 12, color: C.danger, lineHeight: 1.7 }}>⚠️ 이 시그널은 거시 유동성 조건만 반영하며 투자 조언이 아닙니다.</div>
        </>)}

        {/* MACRO */}
        {tab === "macro" && filtered.length > 0 && (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[{ l: "SOFR", v: latest.sofr, u: "%" }, { l: "EFFR", v: latest.effr, u: "%" }, { l: "DXY", v: latest.dxy, u: "" }, { l: "VIX", v: latest.vix, u: "" }, { l: "10Y", v: latest.yield10y, u: "%" }, { l: "2Y", v: latest.yield2y, u: "%" }, { l: "M2", v: latest.globalM2, u: "T$" }, { l: "Reserves", v: latest.reserves, u: "B$" }, { l: "RRP", v: latest.rrp, u: "B$" }].map(function(m, i) {
              return (<div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ color: C.t3, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
                <div style={{ color: C.t1, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{m.v != null ? m.v.toLocaleString() : "—"}<span style={{ fontSize: 11, color: C.t3, marginLeft: 3 }}>{m.u}</span></div>
              </div>);
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
                <Tooltip content={Tip} /><ReferenceLine yAxisId="l" y={3.65} stroke={C.danger} strokeDasharray="5 5" />
                <Line yAxisId="l" type="monotone" dataKey="sofr" name="SOFR" stroke={C.cyan} strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="dxy" name="DXY" stroke={C.orange} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>)}

        {/* FORECAST — VIX + BTC Pi Cycle + MVRV-Z Score */}
        {tab === "forecast" && (<>
          {/* VIX Chart (FRED real-time) */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>VIX 변동성 지수</h2>
              <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.accentD, color: C.accent }}>FRED 실시간</span>
            </div>
            <p style={{ color: C.t3, fontSize: 12, margin: "0 0 16px" }}>CBOE VIX — S&P 500 30일 내재변동성. 공포 지수로 불리며, 20 이하 = 안정, 30+ = 공포, 40+ = 패닉.</p>
            {filtered.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={filtered}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: C.t3, fontSize: 10 }} tickFormatter={function(v) { return (v || "").substring(2, 7); }} interval={Math.max(1, Math.floor(filtered.length / 10))} />
                  <YAxis tick={{ fill: C.t3, fontSize: 10 }} domain={[0, "auto"]} />
                  <Tooltip content={Tip} />
                  <ReferenceLine y={20} stroke={C.accent} strokeDasharray="5 5" label={{ value: "안정 20", fill: C.accent, fontSize: 10 }} />
                  <ReferenceLine y={30} stroke={C.warn} strokeDasharray="5 5" label={{ value: "공포 30", fill: C.warn, fontSize: 10 }} />
                  <Area type="monotone" dataKey="vix" name="VIX" stroke={C.danger} fill={C.dangerD} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16 }}>
              {[{ l: "현재 VIX", v: latest.vix || "—", c: (latest.vix || 20) > 30 ? C.danger : (latest.vix || 20) > 20 ? C.warn : C.accent },
                { l: "상태", v: (latest.vix || 20) < 15 ? "극도 안정" : (latest.vix || 20) < 20 ? "안정" : (latest.vix || 20) < 30 ? "경계" : (latest.vix || 20) < 40 ? "공포" : "패닉", c: (latest.vix || 20) > 30 ? C.danger : (latest.vix || 20) > 20 ? C.warn : C.accent },
                { l: "시장 영향", v: (latest.vix || 20) > 30 ? "위험자산 매도" : (latest.vix || 20) > 20 ? "변동성 확대" : "위험자산 우호", c: C.t2 },
                { l: "역사적 평균", v: "~19.5", c: C.t3 }
              ].map(function(m, i) {
                return (<div key={i} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.c, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                </div>);
              })}
            </div>
          </div>

          {/* VIX Interpretation */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>VIX 해석 가이드</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {[{ range: "< 15", label: "극도 안정 (Complacency)", desc: "시장 안일. 역사적으로 급락 전 자주 관찰. 풋옵션 헤지 고려.", color: C.cyan },
                { range: "15 - 20", label: "안정 (Normal)", desc: "정상 범위. 위험자산 우호적 환경. BTC/주식 상승 여건.", color: C.accent },
                { range: "20 - 30", label: "경계 (Elevated)", desc: "불확실성 증가. 포지션 사이즈 축소 권장. 변동성 헤지 필요.", color: C.warn },
                { range: "30 - 40", label: "공포 (Fear)", desc: "패닉 매도 진행. 역사적 매수 기회. 순유동성 동반 확인 필수.", color: C.orange },
                { range: "> 40", label: "패닉 (Extreme Fear)", desc: "2008, 2020 수준. 대형 매수 기회이나 타이밍 중요. 분할매수 권장.", color: C.danger }
              ].map(function(v, i) {
                return (<div key={i} style={{ padding: "14px 16px", background: C.bg, borderRadius: 10, border: "1px solid " + C.border, borderLeft: "3px solid " + v.color }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: v.color, fontFamily: "monospace" }}>{v.range}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{v.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.6 }}>{v.desc}</p>
                </div>);
              })}
            </div>
          </div>

          {/* BTC Pi Cycle Top Indicator */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>BTC Pi Cycle Top Indicator</h2>
              <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.purpleD, color: C.purple }}>온체인</span>
            </div>
            <p style={{ color: C.t3, fontSize: 12, margin: "0 0 16px" }}>111일 이동평균(111DMA)이 350일 이동평균×2(350DMA×2)를 상향 돌파하면 사이클 고점 신호. 역사적으로 3일 이내 정확도.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: C.bg, borderRadius: 12, padding: 20, border: "1px solid " + C.border }}>
                <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>계산 공식</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
                  <div><span style={{ color: C.cyan, fontWeight: 600 }}>111DMA</span> = BTC 111일 단순이동평균</div>
                  <div><span style={{ color: C.orange, fontWeight: 600 }}>350DMA × 2</span> = BTC 350일 단순이동평균 × 2</div>
                  <div style={{ marginTop: 8, color: C.danger, fontWeight: 600 }}>{"신호: 111DMA > 350DMA×2 → 사이클 고점"}</div>
                  <div style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>350 / 111 = 3.153 (Pi의 근사값)</div>
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 12, padding: 20, border: "1px solid " + C.border }}>
                <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>역사적 성과</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 2 }}>
                  {[{ cycle: "2013.11", top: "$1,177", accuracy: "1일 이내" },
                    { cycle: "2017.12", top: "$19,783", accuracy: "3일 이내" },
                    { cycle: "2021.04", top: "$63,558", accuracy: "3일 이내" }
                  ].map(function(h, i) {
                    return (<div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.warn }}>{h.cycle}</span>
                      <span style={{ fontFamily: "monospace", color: C.t1 }}>{h.top}</span>
                      <span style={{ color: C.accent, fontSize: 11 }}>{h.accuracy}</span>
                    </div>);
                  })}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 16, background: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>현재 상태 (2026.03 기준)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: C.t3 }}>111DMA 위치</div><div style={{ fontSize: 16, fontWeight: 700, color: C.cyan, fontFamily: "monospace" }}>350DMA×2 하회</div></div>
                <div><div style={{ fontSize: 11, color: C.t3 }}>교차 상태</div><div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>미교차 (안전)</div></div>
                <div><div style={{ fontSize: 11, color: C.t3 }}>해석</div><div style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>사이클 고점 아직 아님</div></div>
              </div>
              <p style={{ fontSize: 12, color: C.t3, margin: "10px 0 0", lineHeight: 1.6 }}>111DMA가 350DMA×2에 접근 중이나 아직 교차하지 않음. 이전 사이클 대비 상승 여력 존재. Glassnode/Bitcoin Magazine Pro에서 실시간 확인 권장.</p>
            </div>
          </div>

          {/* MVRV Z-Score */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>BTC MVRV Z-Score</h2>
              <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.purpleD, color: C.purple }}>온체인</span>
            </div>
            <p style={{ color: C.t3, fontSize: 12, margin: "0 0 16px" }}>시장가치(Market Cap)와 실현가치(Realized Cap)의 편차를 표준편차로 정규화. 고점/저점 예측에 역사적으로 2주 이내 정확도.</p>
            <div style={{ background: C.bg, borderRadius: 12, padding: 20, border: "1px solid " + C.border, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>계산 공식</div>
              <div style={{ fontSize: 15, color: C.t1, fontFamily: "monospace", textAlign: "center", padding: "12px 0", background: C.card, borderRadius: 8 }}>
                MVRV Z-Score = (Market Cap - Realized Cap) / StdDev(Market Cap)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ padding: 12, borderRadius: 8, background: C.card }}>
                  <div style={{ fontSize: 11, color: C.t3 }}>Market Cap</div>
                  <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>현재 BTC 가격 × 유통량. 시장 심리 반영.</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.card }}>
                  <div style={{ fontSize: 11, color: C.t3 }}>Realized Cap</div>
                  <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>각 UTXO의 마지막 이동 가격 합산. "공정가치".</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.card }}>
                  <div style={{ fontSize: 11, color: C.t3 }}>Standard Deviation</div>
                  <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>시작일부터 현재까지 누적 표준편차.</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[{ range: "Z > 7", label: "극도 과열 (레드존)", desc: "사이클 고점 임박. 2013: Z=9.5, 2017: Z=9.5, 2021: Z=7.5", color: C.danger },
                { range: "3 < Z < 7", label: "과열 주의", desc: "강세장 후반. 부분 이익실현 권장. 모멘텀 둔화 감시.", color: C.warn },
                { range: "0 < Z < 3", label: "정상 범위", desc: "공정가치 근처. 장기 보유 유리. 현재 대부분의 시간 이 구간.", color: C.accent },
                { range: "Z < 0", label: "저평가 (그린존)", desc: "시장가 < 실현가. 역사적 최적 매수 구간. 2015, 2019, 2022.", color: C.cyan }
              ].map(function(z, i) {
                return (<div key={i} style={{ padding: "14px 16px", background: C.bg, borderRadius: 10, border: "1px solid " + C.border, borderLeft: "3px solid " + z.color }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: z.color, fontFamily: "monospace" }}>{z.range}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{z.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.6 }}>{z.desc}</p>
                </div>);
              })}
            </div>
            <div style={{ padding: 16, background: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>현재 상태 (2026.03 기준)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: C.t3 }}>추정 Z-Score</div><div style={{ fontSize: 22, fontWeight: 800, color: C.warn, fontFamily: "monospace" }}>~2.5</div></div>
                <div><div style={{ fontSize: 11, color: C.t3 }}>구간</div><div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>정상 범위</div></div>
                <div><div style={{ fontSize: 11, color: C.t3 }}>해석</div><div style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>공정가치 상회, 과열 아님</div></div>
              </div>
              <p style={{ fontSize: 12, color: C.t3, margin: "10px 0 0", lineHeight: 1.6 }}>레드존(Z=7+)까지 상당한 거리. 사이클 고점 도달 전 상승 여력 존재. Glassnode, CoinGlass에서 실시간 Z-Score 확인 권장.</p>
            </div>
          </div>

          {/* Composite Forecast */}
          <div style={{ background: C.card, border: "2px solid " + C.purple + "44", borderRadius: 20, padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>복합 예측 종합</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
              {(function() {
                var vixVal = latest.vix || 20;
                var vixSignal = vixVal > 30 ? "공포 — 역발상 매수 구간" : vixVal > 20 ? "경계 — 포지션 축소" : "안정 — 위험자산 우호";
                var vixColor = vixVal > 30 ? C.danger : vixVal > 20 ? C.warn : C.accent;
                return [
                  { icon: "◉", name: "VIX", value: String(vixVal), signal: vixSignal, color: vixColor, source: "FRED 실시간" },
                  { icon: "◎", name: "Pi Cycle Top", value: "미교차", signal: "사이클 고점 아님 — 상승 여력 존재", color: C.accent, source: "온체인 (Glassnode)" },
                  { icon: "◈", name: "MVRV Z-Score", value: "~2.5", signal: "정상 범위 — 과열 아님, 레드존 거리 멀음", color: C.accent, source: "온체인 (Glassnode)" },
                  { icon: "◆", name: "순유동성", value: (latest.netLiquidity || 0).toLocaleString() + " B$", signal: signal ? signal.label : "관망", color: signal ? signal.color : C.t2, source: "FRED 실시간" },
                  { icon: "◇", name: "TGA", value: (latest.tga || 0) + " B$", signal: (latest.tga || 0) > 800 ? "유동성 흡수 중" : "유동성 공급 중", color: (latest.tga || 0) > 800 ? C.danger : C.accent, source: "FRED 실시간" },
                  { icon: "○", name: "DXY", value: String(latest.dxy || "—"), signal: (latest.dxy || 99) > 110 ? "달러 초강세 — 위험자산 약세" : "달러 안정", color: (latest.dxy || 99) > 110 ? C.danger : C.accent, source: "FRED 실시간" }
                ];
              })().map(function(f, i) {
                return (<div key={i} style={{ background: C.bg, borderRadius: 12, padding: "16px 18px", border: "1px solid " + C.border }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, color: f.color }}>{f.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: C.t3, background: C.card, padding: "2px 6px", borderRadius: 4 }}>{f.source}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: f.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{f.value}</div>
                  <div style={{ fontSize: 12, color: C.t2 }}>{f.signal}</div>
                </div>);
              })}
            </div>
            <div style={{ padding: 16, background: C.bg, borderRadius: 12, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 8, textAlign: "center" }}>종합 판단</div>
              <p style={{ fontSize: 13, color: C.t2, margin: 0, lineHeight: 1.8, textAlign: "center" }}>
                {(function() {
                  var vv = latest.vix || 20;
                  var bullCount = 0; var bearCount = 0;
                  if (vv < 20) bullCount++; else if (vv > 30) { bullCount++; } else bearCount++;
                  bullCount++; // Pi Cycle 미교차
                  bullCount++; // MVRV Z < 7
                  if ((latest.tga || 0) < 600) bullCount++; else bearCount++;
                  if ((latest.dxy || 99) < 105) bullCount++; else bearCount++;
                  if (signal && signal.score > 0) bullCount++; else bearCount++;
                  if (bullCount >= 4) return "BTC 사이클 고점 미도달 + 유동성 조건 혼조 → 중기적 상승 여력 존재. Pi Cycle 미교차, MVRV-Z 정상 범위 확인. 단, TGA $" + (latest.tga || 0) + "B 고잔고 및 DXY " + (latest.dxy || "—") + " 강세가 단기 압박 요인.";
                  if (bearCount >= 4) return "유동성 긴축 + 달러 강세 + VIX 상승 → 단기 위험자산 하방 압력. 그러나 Pi Cycle/MVRV-Z는 사이클 고점이 아님을 시사.";
                  return "강세/약세 요인이 혼재. Pi Cycle/MVRV-Z는 사이클 고점 미도달 시사 (중기 긍정). 그러나 TGA/DXY/VIX는 단기 변동성 확대 가능성을 경고. 분할 매수/포지션 관리 권장.";
                })()}
              </p>
            </div>
          </div>

          {/* Data sources note */}
          <div style={{ padding: 16, background: C.card, borderRadius: 12, border: "1px solid " + C.border, fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
            <strong style={{ color: C.t2 }}>데이터 소스:</strong> VIX — FRED VIXCLS (실시간). Pi Cycle / MVRV Z-Score — 온체인 데이터 (Glassnode, Bitcoin Magazine Pro, CoinGlass). 온체인 지표는 무료 API 미제공으로 큐레이션 데이터 기반. 실시간 확인:
            <a href="https://www.bitcoinmagazinepro.com/charts/pi-cycle-top-indicator/" target="_blank" rel="noopener" style={{ color: C.cyan, marginLeft: 4 }}>Pi Cycle</a> |
            <a href="https://www.bitcoinmagazinepro.com/charts/mvrv-zscore/" target="_blank" rel="noopener" style={{ color: C.cyan, marginLeft: 4 }}>MVRV Z-Score</a> |
            <a href="https://studio.glassnode.com/charts/market.MvrvZScore" target="_blank" rel="noopener" style={{ color: C.cyan, marginLeft: 4 }}>Glassnode</a>
            <br /><strong style={{ color: C.warn }}>⚠️</strong> 예측은 참고 목적이며 투자 조언이 아닙니다. 모든 지표는 후행적이며 미래를 보장하지 않습니다.
          </div>
        </>)}

        {/* NEWS & ALERTS */}
        {tab === "news" && (<>
          {/* Data-driven Alerts */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>데이터 기반 자동 알림</h2>
              <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.accentD, color: C.accent }}>FRED 실시간</span>
            </div>
            <p style={{ color: C.t3, fontSize: 12, margin: "0 0 16px" }}>FRED 데이터의 급변동을 자동 감지하여 자산시장 영향을 분석합니다. 추가 API 키 불필요.</p>
            {alerts.map(function(a, i) {
              var colors = { danger: C.danger, warn: C.warn, positive: C.accent, neutral: C.t2 };
              var bgColors = { danger: C.dangerD, warn: C.warnD, positive: C.accentD, neutral: C.border };
              var ac = colors[a.type] || C.t2;
              return (<div key={i} style={{ padding: "16px 20px", background: bgColors[a.type] || C.border, borderRadius: 12, border: "1px solid " + ac + "33", marginBottom: 10, borderLeft: "3px solid " + ac }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{a.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: ac }}>{a.title}</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.t3, fontFamily: "monospace" }}>{a.time}</span>
                </div>
                <p style={{ fontSize: 13, color: C.t2, margin: "0 0 8px", lineHeight: 1.6 }}>{a.detail}</p>
                <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: ac + "22", color: ac }}>영향: {a.impact}</span>
              </div>);
            })}
          </div>

          {/* FOMC Calendar */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>2026 FOMC 일정</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FOMC_2026.map(function(m, i) {
                var isNext = !m.done && (i === 0 || FOMC_2026[i - 1].done);
                return (<div key={i} style={{ padding: "10px 14px", borderRadius: 10, minWidth: 110, background: isNext ? C.warnD : m.done ? C.bg : C.card, border: "1px solid " + (isNext ? C.warn + "66" : C.border) }}>
                  <div style={{ fontSize: 11, color: isNext ? C.warn : m.done ? C.accent : C.t3, fontWeight: 600, marginBottom: 4 }}>{isNext ? "▶ 다음" : m.done ? "✓" : "예정"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{m.date}</div>
                  {m.result && <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 600 }}>{m.result}</div>}
                </div>);
              })}
            </div>
          </div>

          {/* Live News Feed */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>실시간 금융 뉴스</h2>
                <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.blueD, color: C.blue }}>RSS LIVE</span>
              </div>
              <button onClick={fetchNews} disabled={newsLoading} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: newsLoading ? C.t3 : C.blue, fontSize: 11, fontWeight: 600, cursor: newsLoading ? "wait" : "pointer" }}>{newsLoading ? "◌ 로딩..." : "⟳ 새로고침"}</button>
            </div>
            <p style={{ color: C.t3, fontSize: 11, margin: "0 0 12px" }}>CNBC, MarketWatch, Investing.com, Reuters 등 주요 금융 매체에서 자동 수집 (5분 캐시)</p>
            {news.length === 0 && !newsLoading && <p style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: 20 }}>뉴스를 불러오는 중이거나 일시적으로 사용할 수 없습니다.</p>}
            {news.map(function(n, i) {
              var catColors = { MARKETS: C.cyan, ECONOMY: C.warn, FINANCE: C.accent, BUSINESS: C.purple };
              var cc = catColors[n.cat] || C.blue;
              var timeAgo = "";
              if (n.timestamp) {
                var diff = Math.floor((Date.now() - n.timestamp) / 60000);
                if (diff < 60) timeAgo = diff + "분 전";
                else if (diff < 1440) timeAgo = Math.floor(diff / 60) + "시간 전";
                else timeAgo = Math.floor(diff / 1440) + "일 전";
              }
              return (<a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "14px 18px", background: C.bg, borderRadius: 10, border: "1px solid " + C.border, marginBottom: 8, textDecoration: "none", borderLeft: "3px solid " + cc, transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: cc + "22", color: cc }}>{n.cat}</span>
                    <span style={{ fontSize: 10, color: C.t3 }}>{n.source}</span>
                  </div>
                  <span style={{ fontSize: 10, color: C.t3, fontFamily: "monospace" }}>{timeAgo}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, lineHeight: 1.4, marginBottom: 2 }}>{n.titleKo || n.title}</div>
                {n.titleKo && <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.3, marginBottom: 4 }}>{n.title}</div>}
                {n.desc && <p style={{ fontSize: 11, color: C.t3, margin: 0, lineHeight: 1.5 }}>{n.desc.substring(0, 120)}{n.desc.length > 120 ? "..." : ""}</p>}
              </a>);
            })}
          </div>

          <div style={{ padding: 16, background: C.card, borderRadius: 12, border: "1px solid " + C.border, fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
            <strong style={{ color: C.t2 }}>소스:</strong> 데이터 알림 — FRED API (주간). 실시간 뉴스 — CNBC, MarketWatch, Investing.com, Reuters RSS (5분 캐시, API 키 불필요).
            <br /><strong style={{ color: C.warn }}>⚠️</strong> 알림과 뉴스는 참고 목적이며 투자 조언이 아닙니다.
          </div>
        </>)}

        {/* Footer */}
        <div style={{ marginTop: 32, padding: 20, background: C.card, borderRadius: 12, border: "1px solid " + C.border, fontSize: 12, color: C.t3 }}>
          <strong style={{ color: C.t2 }}>데이터:</strong> FRED API 11개 시리즈 | 30분 캐시
          <br /><strong style={{ color: C.warn }}>⚠️</strong> 교육/참고 목적이며 투자 조언이 아닙니다.
        </div>
      </div>
    </div>
  );
}
