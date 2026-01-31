export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>LINE WORKS Calendar Sync</h1>
      <p>LINE WORKS → Google Calendar 一方向同期サービス</p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        このサービスは Vercel Cron により10分ごとに自動実行されます。
      </p>
    </main>
  );
}
