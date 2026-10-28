
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  previewImport,
  confirmImport,
  listTransactions,
} = require("../controllers/transactionController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listTransactions);
router.post("/import/preview", previewImport);
router.post("/import/confirm", confirmImport);

module.exports = router;
