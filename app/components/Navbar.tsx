"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); // Hook to get the current URL path
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

  // boolean to check if we are on an auth page
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <nav style={{ padding: '1rem', background: '#333', color: '#fff', display: 'flex', gap: '20px' }}>
      {/* Optional: You can also hide the main logo link on auth pages if you want, 
         or just leave it pointing to dashboard/login 
      */}
      <Link href={isLoggedIn ? "/dashboard" : "/login"} style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
        2048 Battle
      </Link>
      
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px' }}>
        
        {/* HIDE Leaderboard if on Login or Register page */}
        {!isAuthPage && (
           <Link href="/leaderboard" style={{ color: '#ccc' }}>Leaderboard</Link>
        )}

        {isLoggedIn ? (
          <>
            <Link href="/game" style={{ color: '#4CAF50' }}>Play Now</Link>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            {/* You can also hide these links if you are already on that specific page, but keeping them is fine */}
            <Link href="/login" style={{ color: 'white', fontWeight: pathname === '/login' ? 'bold' : 'normal' }}>Login</Link>
            <Link href="/register" style={{ color: 'white', fontWeight: pathname === '/register' ? 'bold' : 'normal' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}