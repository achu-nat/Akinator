"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GamePage() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [question, setQuestion] = useState<any>(null);
  const [guess, setGuess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Start Game on Load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Start a new session
    fetch("/api/game/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.gameId) {
          setGameId(data.gameId);
          // Immediately fetch the first question (no answer yet)
          fetchNextStep(data.gameId, null, null);
        }
      })
      .catch(e => console.error(e));
  }, [router]);

  // 2. Fetch Next Step (Question or Guess)
  const fetchNextStep = async (gId: number, answer: string | null, prevQId: number | null) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch("/api/game/next", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId: gId, answer, previousQuestionId: prevQId })
      });
      
      const data = await res.json();
      
      if (data.type === 'guess') {
        setGuess(data.character);
        setQuestion(null);
      } else {
        setQuestion(data.question);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. End Game (Save Score)
  const handleEndGame = async (won: boolean) => {
    const token = localStorage.getItem("token");
    // If we guessed right, you get points!
    const score = won ? 100 : 10; 
    
    await fetch("/api/game/end", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ gameId, score })
    });
    router.push('/dashboard');
  };

  if (!gameId || loading) return <div style={{textAlign: 'center', marginTop: '50px'}}>Thinking...</div>;

  // --- GUESS VIEW ---
  if (guess) {
    return (
      <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>I think I know!</h1>
        <div style={{ padding: '30px', border: '2px solid #333', borderRadius: '10px', margin: '20px 0' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#0070f3' }}>{guess.name}</h2>
          <p>Confidence: {(guess.probability * 100).toFixed(1)}%</p>
        </div>
        
        <h3>Am I right?</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button 
            onClick={() => handleEndGame(true)}
            style={{ padding: '15px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            Yes! (You Win)
          </button>
          <button 
            onClick={() => handleEndGame(false)}
            style={{ padding: '15px 30px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            No (I Win)
          </button>
        </div>
      </div>
    );
  }

  // --- QUESTION VIEW ---
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Question #{question.id}</h1>
      <div style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>{question.text}</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
        <button 
          onClick={() => fetchNextStep(gameId!, 'yes', question.id)}
          style={{ padding: '15px 40px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          Yes
        </button>
        <button 
          onClick={() => fetchNextStep(gameId!, 'no', question.id)}
          style={{ padding: '15px 40px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          No
        </button>
      </div>
    </div>
  );
}