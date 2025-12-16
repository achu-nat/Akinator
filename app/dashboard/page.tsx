"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(() => router.push("/login"));
  }, [router]);

  if (!profile) return <p>Loading...</p>;

  return (
    <div>
      <h1>Welcome, {profile.username}!</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>Your Stats</h2>
          <p><strong>Best Score:</strong> {profile.best_score}</p>
          <p><strong>Games Played:</strong> {profile.games_played}</p>
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h2>Ready to Battle?</h2>
          <p>Can you beat your high score?</p>
          <Link href="/game">
            <button style={{ fontSize: '1.2rem', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Start New Game
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}