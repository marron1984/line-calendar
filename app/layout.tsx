export const metadata = {
  title: 'LINE WORKS Calendar Sync',
  description: 'LINE WORKS to Google Calendar one-way sync',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
