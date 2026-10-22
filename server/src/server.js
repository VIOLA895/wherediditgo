
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Parse JSON request bodies before routes
app.use(express.json());

// Temporary debugging middleware
app.use("/api/claims", (req, res, next) => {
  console.log("Claims request:", req.method, req.originalUrl);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Parsed body:", req.body);
  next();
});

app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "WhereDidItGo API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

app.listen(PORT, () => {
  console.log(`WhereDidItGo API running at http://localhost:${PORT}`);
});
