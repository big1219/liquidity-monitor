import Head from "next/head";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("../components/Dashboard"), { 
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", background: "#0a0e17", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#00d4aa" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>◉</div>
        <div style={{ fontSize: 14, color: "#94a3b8" }}>FRED 실시간 데이터 로딩 중...</div>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <>
      <Head>
        <title>Net Liquidity Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Dashboard />
    </>
  );
}
