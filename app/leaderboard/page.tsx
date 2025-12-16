"use client";
import { useEffect, useState } from "react";

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // This is a public route, no token needed
    fetch("/api/leaderboard?limit=10")
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <div>
      <h1>Top Players</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Rank</th>
            <th style={{ padding: '10px' }}>Username</th>
            <th style={{ padding: '10px' }}>Best Score</th>
            <th style={{ padding: '10px' }}>Games Played</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: any, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>#{index + 1}</td>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>{user.username}</td>
              <td style={{ padding: '10px' }}>{user.best_score}</td>
              <td style={{ padding: '10px' }}>{user.games_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}