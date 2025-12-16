import Navbar from "./components/Navbar";
// import "./globals.css"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <Navbar />
        <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}