import express from "express";
import cors from "cors";
import * as solanaWeb3 from "@solana/web3.js";

const app = express();
app.use(cors());
app.use(express.json());

const connection = new solanaWeb3.Connection(
  solanaWeb3.clusterApiUrl("mainnet-beta")
);

// 🔴 CHANGE THIS
const TREASURY = "YOUR_WALLET_ADDRESS";

let farms = {};

// --- VERIFY PAYMENT ---
async function verifyPayment(signature, wallet) {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed"
    });

    if (!tx) return false;

    const keys = tx.transaction.message.accountKeys.map(k => k.toString());

    return keys.includes(wallet) && keys.includes(TREASURY);
  } catch {
    return false;
  }
}

// --- BUY SEED ---
app.post("/buy-seed", async (req, res) => {
  const { wallet, seedType, signature } = req.body;

  const valid = await verifyPayment(signature, wallet);
  if (!valid) return res.status(400).json({ error: "Invalid tx" });

  if (!farms[wallet]) farms[wallet] = [];

  farms[wallet].push({
    seedType,
    plantedAt: Date.now()
  });

  res.json({ success: true });
});

// --- GET FARM ---
app.get("/farm/:wallet", (req, res) => {
  res.json(farms[req.params.wallet] || []);
});

// --- HARVEST ---
app.post("/harvest", (req, res) => {
  const { wallet, index } = req.body;

  const plant = farms[wallet]?.[index];
  if (!plant) return res.status(400).json({ error: "No plant" });

  const growTimes = [4, 8, 12];
  const rewards = [320, 1550, 6200];

  const now = Date.now();
  const growTime = growTimes[plant.seedType] * 3600000;

  if (now - plant.plantedAt < growTime) {
    return res.status(400).json({ error: "Not ready" });
  }

  const reward = rewards[plant.seedType];

  farms[wallet].splice(index, 1);

  res.json({ success: true, reward });
});

app.listen(3000, () => console.log("Backend running on 3000"));
