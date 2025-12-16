"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [game, setGame] = useState<any>(null);
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 1. RESUME GAME LOGIC ---
  useEffect(() => {
    const resumeId = searchParams.get('id');
    if (resumeId && !game) {
       fetch(`/api/game/state?id=${resumeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
       })
       .then(res => res.json())
       .then(data => {
          if (!data.error) setGame(data);
       });
    }
  }, [searchParams]);

  // --- 2. GAME LOOP (POLLING) ---
  useEffect(() => {
    // Poll if game exists and isn't over
    if (!game || game.status === 'over') return;

    const interval = setInterval(() => {
      fetch(`/api/game/state?id=${game.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => res.json())
      .then(data => {
        // Only update state if board or status changed to prevent jitter
        setGame((prev: any) => {
            if (JSON.stringify(prev?.board_state) !== JSON.stringify(data.board_state) || prev?.status !== data.status || prev?.guest_id !== data.guest_id) {
                return data;
            }
            return prev;
        });
      });
    }, 1000); 

    return () => clearInterval(interval);
  }, [game?.id, game?.status]);

  // --- 3. CONTROLS ---
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
      // Immediate fetch for responsiveness
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


  // --- 4. ACTIONS ---
  const createGame = async (mode: 'solo' | 'collab') => {
    setLoading(true);
    const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        // We must send the mode so the backend knows whether to set status='active' (solo) or 'waiting' (collab)
        body: JSON.stringify({ mode }) 
    });
    const data = await res.json();
    setGame(data);
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
        const stateRes = await fetch(`/api/game/state?id=${data.gameId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setGame(await stateRes.json());
    } else {
        alert(data.error || "Failed to join");
    }
    setLoading(false);
  };

  const exitGame = async () => {
    if (!game) return;

    await fetch("/api/game/quit", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ gameId: game.id })
    });

    router.push("/dashboard");
  };

  // --- 5. RENDER LOBBY (No Game Selected) ---
  if (!game) {
    return (
      <div style={{ maxWidth: '500px', margin: '50px auto', textAlign: 'center' }}>
        <h1>2048 Battle</h1>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '40px' }}>
            <button onClick={() => createGame('solo')} disabled={loading} style={{ padding: '20px', fontSize: '1.2rem', background: '#e0a800', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '150px' }}>
                Solo Mode
            </button>
            <button onClick={() => createGame('collab')} disabled={loading} style={{ padding: '20px', fontSize: '1.2rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '150px' }}>
                Co-op Room
            </button>
        </div>

        <div style={{ borderTop: '1px solid #ccc', paddingTop: '30px' }}>
            <h3>Join Existing Room</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <input 
                    value={inputCode} 
                    onChange={e => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE" 
                    style={{ padding: '10px', fontSize: '1.2rem', textTransform: 'uppercase', width: '120px' }}
                />
                <button onClick={joinGame} disabled={loading} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Join
                </button>
            </div>
        </div>
      </div>
    );
  }

  // --- 6. RENDER GAME ---
  
  // FIX: Only consider it "Solo" if there is no guest AND we are not waiting for one.
  const isSolo = !game.guest_id && !game.guest_name && game.status !== 'waiting';

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {/* Header / HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
         <div style={{ textAlign: 'left' }}>
            {isSolo ? (
                <h2 style={{margin: 0}}>Solo Run</h2>
            ) : (
                <>
                    <h2 style={{margin: 0}}>Room: {game.game_code}</h2>
                    <p style={{margin: '5px 0'}}>
                        {game.host_name} & {game.guest_name || '(Waiting...)'}
                    </p>
                </>
            )}
         </div>
         <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{game.score}</h2>
            <small>SCORE</small>
         </div>
      </div>

      {/* Board Grid */}
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

      {/* Footer / Status */}
      {game.status === 'over' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ color: 'red' }}>GAME OVER!</h2>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Back to Dashboard
            </button>
          </div>
      )}
      
      {game.status === 'waiting' && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
             <p style={{ margin: 0, fontWeight: 'bold' }}>Waiting for Player 2...</p>
             <p style={{ margin: '5px 0' }}>Share Code: <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{game.game_code}</span></p>
          </div>
      )}

      {game.status !== 'over' && (
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Use Arrow Keys to Move</span>
              <button onClick={exitGame} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  {isSolo ? "Save & Exit" : "Discard & Exit"}
              </button>
          </div>
      )}
    </div>
  );
}

export default function Game2048() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GameContent />
        </Suspense>
    );
}

// Utility for colors
function getTileColor(value: number) {
    const colors: { [key: number]: string } = {
        0: '#e5e5e5',      // light gray
        2: '#f4c7c3',      // muted pastel pink
        4: '#f3d2a9',      // darker peach
        8: '#f0d774ff',      // warm pastel yellow
        16: '#cfe6b8',     // soft green
        32: '#a5d6e3ff',     // soft cyan
        64: '#cfc8ee',     // lavender
        128: '#e9bfdc',    // dusty rose
        256: '#f3bcbc',    // coral pastel
        512: '#cfe3b1',    // mint
        1024: '#bfd6f6',   // periwinkle
        2048: '#f4dc8f'    // muted gold
    };

    return colors[value] || '#d1d5db'; // fallback neutral
}

