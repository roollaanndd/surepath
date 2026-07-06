var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { amount, policyType, userId, email } = req.body;
      if (!amount || !userId) {
        return res.status(400).json({ error: "Invalid payment request payload" });
      }
      const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      await new Promise((r) => setTimeout(r, 600));
      res.json({
        success: true,
        transactionId,
        paymentUrl: `/payment-simulation?tx=${transactionId}&amount=${amount}`,
        token: `mok_${transactionId}_${Date.now()}`
      });
    } catch (error) {
      console.error("Payment generation error:", error);
      res.status(500).json({ error: "Failed to initialize payment gateway" });
    }
  });
  app.post("/api/payments/webhook", (req, res) => {
    const signatureKey = req.headers["x-callback-token"];
    res.status(200).json({ received: true });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Backend running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
