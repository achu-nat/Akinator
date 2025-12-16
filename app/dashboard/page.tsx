"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [resumeGameId, setResumeGameId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // 1. Fetch Profile
    fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(() => router.push("/login"));

    // 2. Check for Active Solo Game to Resume
    fetch("/api/game/active", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.gameId) setResumeGameId(data.gameId);
      });

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
          <h2>Play 2048</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <Link href="/game">
              <button style={{ fontSize: '1.2rem', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '200px' }}>
                Start New Game
              </button>
            </Link>

            {resumeGameId && (
              <Link href={`/game?id=${resumeGameId}`}>
                <button style={{ fontSize: '1.2rem', padding: '10px 20px', background: '#e0a800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '200px' }}>
                  Resume Solo Game
                </button>
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}