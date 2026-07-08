import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Payment Gateway Proxy (Simulated Midtrans/Stripe)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { amount, policyType, userId, email } = req.body;
      
      if (!amount || !userId) {
         return res.status(400).json({ error: "Invalid payment request payload" });
      }

      // Here you would normally call Midtrans Snap API or Stripe Checkout API 
      // e.g., const snapToken = await midtrans.createTransaction({ ... })
      // For this demo, we simulate a secure gateway URL generation.
      
      const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Simulate secure token/link generation delay
      await new Promise(r => setTimeout(r, 600));

      res.json({ 
          success: true, 
          transactionId, 
          paymentUrl: `/payment-simulation?tx=${transactionId}&amount=${amount}`,
          token: `mok_${transactionId}_${Date.now()}`
      });
    } catch {
      console.error("Payment generation error:", error);
      res.status(500).json({ error: "Failed to initialize payment gateway" });
    }
  });

  // Webhook for Server-to-Server callbacks
  app.post("/api/payments/webhook", (req, res) => {
     // Verify signature (e.g. from Midtrans) to prevent spoofing
     const signatureKey = req.headers['x-callback-token'];
     // ... validation logic ...
     res.status(200).json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Backend running on port ${PORT}`);
  });
}

startServer();
