import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import whaleRoutes from "./routes/whales.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/whales", whaleRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "SolShadow backend is live 🌊" });
});

app.listen(PORT, () => {
  console.log(`🌊 SolShadow backend running on port ${PORT}`);
});