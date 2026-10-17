const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "WhereDidItGo API is running",
  });
});

app.listen(PORT, () => {
  console.log(`WhereDidItGo API running at http://localhost:${PORT}`);
});
