"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Game2048() {
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);

  // --- GAME LOOP (POLLING) ---
  useEffect(() => {
    if (!game) return;

    const interval = setInterval(() => {
      fetch(`/api/game/state?id=${game.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => res.json())
      .then(data => {
        // Only update if board changed to avoid jitter
        setGame(prev => JSON.stringify(prev?.board_state) !== JSON.stringify(data.board_state) ? data : prev);
      });
    }, 1000); // Check for updates every 1 second

    return () => clearInterval(interval);
  }, [game?.id]);

  // --- KEYBOARD CONTROLS ---
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (!game || game.status !== 'active') return;
    
    let dir = "";
    if (e.key === "ArrowUp") dir = "UP";
    if (e.key === "ArrowDown") dir = "DOWN";
    if (e.key === "ArrowLeft") dir = "LEFT";
    if (e.key === "ArrowRight") dir = "RIGHT";

    if (dir) {
      e.preventDefault();
      await fetch("/api/game/move", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ gameId: game.id, direction: dir })
      });
      // Force immediate update
      const res = await fetch(`/api/game/state?id=${game.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setGame(await res.json());
    }
  }, [game]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);


  // --- LOBBY FUNCTIONS ---
  const createGame = async () => {
    setLoading(true);
    const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const data = await res.json();
    setGame(data); // Will trigger polling
    setLoading(false);
  };

  const joinGame = async () => {
    setLoading(true);
    const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ code: inputCode })
    });
    const data = await res.json();
    if (data.success) {
        // Fetch full initial state
        const stateRes = await fetch(`/api/game/state?id=${data.gameId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setGame(await stateRes.json());
    } else {
        alert(data.error);
    }
    setLoading(false);
  };

  // --- RENDER: LOBBY ---
  if (!game) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
        <h1>2048 Co-op</h1>
        <div style={{ marginBottom: '40px' }}>
            <button onClick={createGame} disabled={loading} style={{ padding: '15px 30px', fontSize: '1.2rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}>
                Create New Room
            </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <input 
                value={inputCode} 
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE" 
                style={{ padding: '10px', fontSize: '1.2rem', textTransform: 'uppercase', width: '120px' }}
            />
            <button onClick={joinGame} disabled={loading} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
                Join
            </button>
        </div>
      </div>
    );
  }

  // --- RENDER: GAME BOARD ---
  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
         <div style={{ textAlign: 'left' }}>
            <h2>Room: {game.game_code}</h2>
            <p>Players: {game.host_name} {game.guest_name ? `& ${game.guest_name}` : '(Waiting...)'}</p>
         </div>
         <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{game.score}</h2>
            <small>SCORE</small>
         </div>
      </div>

      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '10px', 
          background: '#bbada0', 
          padding: '10px', 
          borderRadius: '10px' 
      }}>
        {game.board_state.map((row: number[], r: number) => 
           row.map((tile: number, c: number) => (
              <div key={`${r}-${c}`} style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: getTileColor(tile),
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tile > 100 ? '2rem' : '2.5rem',
                  fontWeight: 'bold',
                  color: tile > 4 ? '#f9f6f2' : '#776e65'
              }}>
                 {tile !== 0 ? tile : ''}
              </div>
           ))
        )}
      </div>

      {game.status === 'over' && (
          <h2 style={{ color: 'red', marginTop: '20px' }}>GAME OVER!</h2>
      )}
      
      {game.status === 'waiting' && (
          <p style={{ marginTop: '20px', color: '#666' }}>Waiting for Player 2 to join...</p>
      )}

      <p style={{ marginTop: '20px', color: '#888' }}>Use Arrow Keys to Move</p>
    </div>
  );
}

// Helper for Tile Colors
function getTileColor(value: number) {
    const colors: {[key:number]: string} = {
        0: '#cdc1b4',
        2: '#eee4da',
        4: '#ede0c8',
        8: '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128: '#edcf72',
        256: '#edcc61',
        512: '#edc850',
        1024: '#edc53f',
        2048: '#edc22e'
    };
    return colors[value] || '#3c3a32';
}