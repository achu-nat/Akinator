"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
    } else {
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h1>Create Account</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          placeholder="Username" 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email" 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="Password (min 6 chars)" 
          required 
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none' }}>Sign Up</button>
      </form>
    </div>
  );
}