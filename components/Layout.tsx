import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-wrapper">
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 10 }}>iValet Portal</h1>
        <nav>
          <Link href="/dashboard" style={{ marginRight: 12 }}>Admin</Link>
          <Link href="/entry" style={{ marginRight: 12 }}>Valet</Link>
          <Link href="/create-qr" style={{ marginRight: 12 }}>Create QR</Link>
          <Link href="/scan-close" style={{ marginRight: 12 }}>Scan</Link>
          <Link href="/login">Logout</Link>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
