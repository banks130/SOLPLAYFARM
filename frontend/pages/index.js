import { useEffect, useState } from "react";
import * as solanaWeb3 from "@solana/web3.js";

const connection = new solanaWeb3.Connection(
  solanaWeb3.clusterApiUrl("mainnet-beta")
);

// 🔴 CHANGE THIS
const TREASURY = "YOUR_WALLET_ADDRESS";

export default function Home() {
  const [wallet, setWallet] = useState(null);
  const [plants, setPlants] = useState([]);

  // --- CONNECT ---
  async function connectWallet() {
    const provider = window.solana;

    if (!provider?.isPhantom) {
      alert("Install Phantom");
      return;
    }

    const res = await provider.connect();
    setWallet(res.publicKey.toString());
  }

  // --- SEND SOL ---
  async function sendSOL(amount) {
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: window.solana.publicKey,
        toPubkey: new solanaWeb3.PublicKey(TREASURY),
        lamports: amount * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );

    transaction.feePayer = window.solana.publicKey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const signed = await window.solana.signTransaction(transaction);
    const sig = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction(sig);

    return sig;
  }

  // --- BUY SEED ---
  async function buySeed(type) {
    const sig = await sendSOL(0.02);

    await fetch("http://localhost:3000/buy-seed", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        wallet,
        seedType: type,
        signature: sig
      })
    });

    loadFarm();
  }

  // --- LOAD FARM ---
  async function loadFarm() {
    const res = await fetch(`http://localhost:3000/farm/${wallet}`);
    const data = await res.json();
    setPlants(data);
  }

  // --- HARVEST ---
  async function harvest(i) {
    const res = await fetch("http://localhost:3000/harvest", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ wallet, index: i })
    });

    const data = await res.json();
    alert("Reward: " + data.reward);

    loadFarm();
  }

  useEffect(() => {
    if (wallet) loadFarm();
  }, [wallet]);

  return (
    <div style={{padding:40}}>
      <h1>SOLPLAY FARM 🌱</h1>

      {!wallet ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>{wallet}</p>
      )}

      <div style={{marginTop:20}}>
        <button onClick={()=>buySeed(0)}>Buy Common</button>
        <button onClick={()=>buySeed(1)}>Buy Rare</button>
        <button onClick={()=>buySeed(2)}>Buy Epic</button>
      </div>

      <h2>Your Farm</h2>
      {plants.map((p,i)=>(
        <div key={i}>
          Seed {p.seedType}
          <button onClick={()=>harvest(i)}>Harvest</button>
        </div>
      ))}
    </div>
  );
}
