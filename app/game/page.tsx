"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GamePage() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'loading' | 'playing' | 'finished'>('loading');
  const router = useRouter();

  // 1. Start the game when component mounts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/game/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setGameId(data.id);
          setStatus('playing');
        }
      });
  }, [router]);

  // 2. Logic to End the Game
  const endGame = async () => {
    const token = localStorage.getItem("token");
    await fetch("/api/game/end", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ gameId, score })
    });
    setStatus('finished');
  };

  // 3. Simple Mock Game Logic
  const handleAction = () => {
    // REPLACE THIS with your actual Akinator logic (answering questions, etc.)
    setScore(prev => prev + 100); 
  };

  if (status === 'loading') return <p>Initializing Game Connection...</p>;

  if (status === 'finished') return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Game Over!</h1>
      <h2>Final Score: {score}</h2>
      <button onClick={() => router.push('/dashboard')} style={{ padding: '10px', background: '#333', color: 'white' }}>Return to Dashboard</button>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Game In Progress</h1>
      <p>Current Score: {score}</p>
      
      {/* REPLACE THE BUTTON BELOW WITH YOUR ACTUAL GAME UI */}
      <div style={{ margin: '40px' }}>
        <button 
          onClick={handleAction} 
          style={{ padding: '20px', fontSize: '1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '50%' }}
        >
          Click to Score Points
        </button>
      </div>

      <button onClick={endGame} style={{ padding: '10px', background: '#dc3545', color: 'white' }}>
        End Game
      </button>
    </div>
  );
}