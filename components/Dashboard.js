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

var CURATED_NEWS = [
  { title: "FOMC 3월: 금리 3.5-3.75% 동결, 연내 1회 인하 전망", date: "2026-03-18", cat: "FOMC", impact: "neutral", summary: "이란 전쟁 불확실성 속 동결. GDP 2.4% 상향, 인플레 2.7%." },
  { title: "Fed MBS $2.01T — 피크 대비 27% 감소", date: "2026-03-12", cat: "MBS", impact: "negative", summary: "QT 종료 후에도 런오프 지속. 만기 대금 → T-bill 전환." },
  { title: "Warsh 차기 Fed 의장 지명 — 매파적 비둘기", date: "2026-02-24", cat: "FED", impact: "warn", summary: "금리 인하 가능하나 적극적 대차대조표 축소 예상. 5월 취임." },
  { title: "ON RRP 완전 고갈 → 유동성 완충 소멸", date: "2026-03-05", cat: "RRP", impact: "negative", summary: "RRP $0. TGA 변동이 지급준비금에 직접 영향. 변동성 확대." },
  { title: "BlackRock: TGA가 은행 유동성의 핵심 결정 요인", date: "2026-02-28", cat: "LIQUIDITY", impact: "negative", summary: "재정-통화정책 얽힘 심화. TGA 재건으로 은행 준비금 2% 급감." },
  { title: "4월 세금 시즌: TGA 급등 → 유동성 흡수 예상", date: "2026-03-10", cat: "TGA", impact: "negative", summary: "4월 중순 대규모 세수 유입 예상. RRP 완충 없어 레포 변동성 주의." },
  { title: "레포시장 $12.6T 돌파 — 시스템 레버리지 의존 심화", date: "2026-02-20", cat: "LIQUIDITY", impact: "warn", summary: "2025년 한 해 레포시장 2배 이상 확대. 구조적 취약성 증가." },
  { title: "스테이블코인 $310B+ 사상 최고 — 크립토 대기자금", date: "2026-03-15", cat: "CRYPTO", impact: "positive", summary: "USDT+USDC 사상 최대. 사이드라인 자금 축적 = 매수 대기." },
];

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

  useEffect(function() { fetchData(); }, [fetchData]);

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
            <p style={{ color: C.t2, fontSize: 12, margin: 0 }}>실시간 FRED API | Net Liquidity = WALCL - TGA - RRP{lastUpdate && <span style={{ color: C.t3, marginLeft: 8 }}>업데이트: {lastUpdate}</span>}</p>
            {error && <p style={{ color: C.danger, fontSize: 12, margin: "4px 0 0" }}>⚠ {error}</p>}
          </div>
          <button onClick={fetchData} disabled={loading} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: loading ? C.border : C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "로딩..." : "⟳ 새로고침"}</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["overview", "종합"], ["signal", "매매시그널"], ["macro", "매크로"], ["news", "뉴스/알림"]].map(function(t) {
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
            { l: "DXY", v: latest.dxy, u: "" }
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
            {[{ l: "SOFR", v: latest.sofr, u: "%" }, { l: "EFFR", v: latest.effr, u: "%" }, { l: "DXY", v: latest.dxy, u: "" }, { l: "10Y", v: latest.yield10y, u: "%" }, { l: "2Y", v: latest.yield2y, u: "%" }, { l: "M2", v: latest.globalM2, u: "T$" }, { l: "Reserves", v: latest.reserves, u: "B$" }, { l: "RRP", v: latest.rrp, u: "B$" }].map(function(m, i) {
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

          {/* Curated News */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>자산시장 영향 뉴스</h2>
              <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: C.blueD, color: C.blue }}>큐레이션</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {CURATED_NEWS.map(function(n, i) {
                var catC = { FOMC: C.blue, MBS: C.purple, FED: C.warn, RRP: C.accent, LIQUIDITY: C.cyan, TGA: C.warn, CRYPTO: C.accent };
                var impC = { positive: C.accent, negative: C.danger, neutral: C.t2, warn: C.warn };
                var cc = catC[n.cat] || C.t2;
                var ic = impC[n.impact] || C.t2;
                return (<div key={i} style={{ padding: "16px 18px", background: C.bg, borderRadius: 12, border: "1px solid " + C.border, borderLeft: "3px solid " + cc }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: cc + "22", color: cc }}>{n.cat}</span>
                    <span style={{ fontSize: 11, color: C.t3, fontFamily: "monospace" }}>{n.date}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 6, lineHeight: 1.4 }}>{n.title}</div>
                  <p style={{ fontSize: 12, color: C.t2, margin: "0 0 8px", lineHeight: 1.6 }}>{n.summary}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ic }}>{n.impact === "positive" ? "▲ 유동성+" : n.impact === "negative" ? "▼ 유동성-" : n.impact === "warn" ? "⚠ 주의" : "● 중립"}</span>
                </div>);
              })}
            </div>
          </div>

          <div style={{ padding: 16, background: C.card, borderRadius: 12, border: "1px solid " + C.border, fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
            <strong style={{ color: C.t2 }}>알림 소스:</strong> 데이터 기반 알림은 FRED API 실시간 데이터의 급변동을 자동 감지합니다. 큐레이션 뉴스는 Fed 공식발표, NY Fed, BlackRock, Wolf Street 등 공개 소스를 기반으로 합니다.
            <br /><strong style={{ color: C.warn }}>⚠️</strong> 뉴스와 알림은 참고 목적이며 투자 조언이 아닙니다.
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
