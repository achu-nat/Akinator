"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if token exists to determine login status
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    router.push('/login');
  };

  return (
    <nav style={{ padding: '1rem', background: '#333', color: '#fff', display: 'flex', gap: '20px' }}>
      <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Akinator Battle</Link>
      
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px' }}>
        <Link href="/leaderboard" style={{ color: '#ccc' }}>Leaderboard</Link>
        {isLoggedIn ? (
          <>
            <Link href="/game" style={{ color: '#4CAF50' }}>Play Now</Link>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ color: 'white' }}>Login</Link>
            <Link href="/register" style={{ color: 'white' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}