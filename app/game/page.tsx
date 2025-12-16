"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [game, setGame] = useState<any>(null);
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for Resume ID in URL
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

  // --- GAME LOOP (POLLING) ---
  useEffect(() => {
    if (!game || game.status === 'over') return;

    const interval = setInterval(() => {
      fetch(`/api/game/state?id=${game.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(res => res.json())
      .then(data => {
        // Only update if board changed or status changed
        setGame(prev => (JSON.stringify(prev?.board_state) !== JSON.stringify(data.board_state) || prev?.status !== data.status) ? data : prev);
      });
    }, 1000); 

    return () => clearInterval(interval);
  }, [game?.id, game?.status]);

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
      // Force update
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
  const createGame = async (mode: 'solo' | 'collab') => {
    setLoading(true);
    const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
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
        alert(data.error);
    }
    setLoading(false);
  };

  const exitGame = async () => {
    if (!game) return;

    // Notify backend to discard if collab, or just leave if solo
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

  // --- RENDER: LOBBY ---
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

  // --- RENDER: GAME BOARD ---
  const isSolo = !game.guest_id && !game.guest_name; // guest_name comes from JOIN in state route

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {/* Header Info */}
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

      {/* Grid */}
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

      {/* Status Messages */}
      {game.status === 'over' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ color: 'red' }}>GAME OVER!</h2>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Back to Dashboard
            </button>
          </div>
      )}
      
      {game.status === 'waiting' && (
          <p style={{ marginTop: '20px', color: '#666' }}>Waiting for Player 2 to join...</p>
      )}

      {/* Controls */}
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

// Wrap in Suspense for useSearchParams
export default function Game2048() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GameContent />
        </Suspense>
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