
const crypto = require("crypto");
const prisma = require("../utils/prisma");

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 10000;

/**
 * Normalize CSV column headings for matching.
 */
function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Parse CSV records, including quoted commas, escaped quotes,
 * and line breaks inside quoted fields.
 */
function parseCSV(csvText) {
  const records = [];
  let record = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (insideQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"' && field.length === 0) {
      insideQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }

      record.push(field);

      if (record.some((value) => value.trim() !== "")) {
        records.push(record);
      }

      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (insideQuotes) {
    throw new Error("The CSV contains an unclosed quoted field.");
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);

    if (record.some((value) => value.trim() !== "")) {
      records.push(record);
    }
  }

  return records;
}

/**
 * Find a column by its normalized heading.
 */
function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

/**
 * Parse common bank statement dates.
 * Slash-separated dates are interpreted as DD/MM/YYYY,
 * which is common in Kenyan statements.
 */
function parseDate(value) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }

    return null;
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }

    return null;
  }

  // Handle other unambiguous date formats supported by JavaScript.
  const timestamp = Date.parse(text);

  if (Number.isNaN(timestamp)) return null;

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parse currency amounts such as:
 * 1,500.00
 * KES 1,500.00
 * (1,500.00)
 * -1500.00
 */
function parseAmount(value) {
  let text = String(value ?? "").trim();

  if (!text) return null;

  let negative = false;

  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  text = text
    .replace(/,/g, "")
    .replace(/^(KES|KSH|USD|EUR|GBP)\s*/i, "")
    .replace(/\s*(KES|KSH|USD|EUR|GBP)$/i, "")
    .replace(/[KSh$€£¥\s]/gi, "");

  if (!text || !/^[+-]?\d+(?:\.\d+)?$/.test(text)) {
    return null;
  }

  let amount = Number(text);

  if (!Number.isFinite(amount)) return null;

  if (negative) amount = -Math.abs(amount);

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Infer transaction type when a statement provides only one amount column.
 *
 * Positive amounts are NOT automatically income.
 * Unknown positive amounts are rejected for manual review.
 */
function inferTransactionType(description, amount) {
  if (amount < 0) return "EXPENSE";

  const text = description.toLowerCase();

  const incomePattern =
    /\b(salary|payroll|wages?|interest earned|dividends?|refund received|cashback|deposit received|incoming transfer|money received|commission received|pension|allowance received)\b/;

  const expensePattern =
    /\b(supermarket|grocer|naivas|carrefour|quickmart|food|restaurant|cafe|uber|bolt|matatu|bus fare|fuel|petrol|shell|transport|rent|landlord|electricity|water bill|internet|wifi|airtime|safaricom|airtel|hospital|pharmacy|clinic|medical|doctor|school fees|tuition|university|bookshop|netflix|spotify|cinema|movie|withdrawal|payment to|purchase|pos purchase|card purchase|sent to|transfer to|bill payment|loan repayment)\b/;

  if (incomePattern.test(text)) return "INCOME";
  if (expensePattern.test(text)) return "EXPENSE";

  return "UNKNOWN";
}

/**
 * Assign a category based on the description and inferred type.
 */
function inferCategory(description, type) {
  if (type === "INCOME") return "Income";

  const text = description.toLowerCase();

  if (
    /supermarket|grocer|naivas|carrefour|quickmart|food|restaurant|cafe/.test(
      text
    )
  ) {
    return "Groceries & Food";
  }

  if (
    /uber|bolt|matatu|bus|fuel|petrol|shell|totalenergies|transport/.test(
      text
    )
  ) {
    return "Transport";
  }

  if (
    /rent|landlord|electricity|water bill|internet|wifi|airtime|safaricom|airtel/.test(
      text
    )
  ) {
    return "Bills & Utilities";
  }

  if (/hospital|pharmacy|clinic|medical|doctor/.test(text)) {
    return "Health";
  }

  if (/school|tuition|university|bookshop/.test(text)) {
    return "Education";
  }

  if (/netflix|spotify|cinema|movie|entertainment/.test(text)) {
    return "Entertainment";
  }

  return "Uncategorized";
}

/**
 * Create a stable fingerprint to prevent importing the same
 * transaction more than once for a user.
 */
function fingerprintFor({ date, description, amount }) {
  const normalizedDescription = description
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const canonical = [
    date.toISOString().slice(0, 10),
    normalizedDescription,
    Number(amount).toFixed(2),
  ].join("|");

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Parse and validate a CSV statement.
 */
function parseStatement(csvText) {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error("Please provide the contents of a CSV file.");
  }

  if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
    throw new Error("The CSV file exceeds the 2 MB size limit.");
  }

  const rawRows = parseCSV(csvText);

  if (rawRows.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one transaction."
    );
  }

  const headers = rawRows[0].map(normalizeHeader);

  const dateIndex = findColumn(headers, [
    "date",
    "transactiondate",
    "valuedate",
    "postingdate",
    "transactiondatetime",
  ]);

  const descriptionIndex = findColumn(headers, [
    "description",
    "details",
    "transactiondescription",
    "transactiondetails",
    "particulars",
    "narration",
    "merchant",
    "payee",
    "reference",
  ]);

  const amountIndex = findColumn(headers, [
    "amount",
    "transactionamount",
    "value",
  ]);

  const debitIndex = findColumn(headers, [
    "debit",
    "withdrawal",
    "withdrawals",
    "moneyout",
    "paidout",
    "dr",
  ]);

  const creditIndex = findColumn(headers, [
    "credit",
    "deposit",
    "deposits",
    "moneyin",
    "paidin",
    "cr",
  ]);

  if (dateIndex === -1) {
    throw new Error(
      "Could not identify a date column. Use a heading such as Date or Transaction Date."
    );
  }

  if (descriptionIndex === -1) {
    throw new Error(
      "Could not identify a description column. Use Description, Details, Narration, or Particulars."
    );
  }

  if (amountIndex === -1 && debitIndex === -1 && creditIndex === -1) {
    throw new Error(
      "Could not identify an amount, debit, or credit column."
    );
  }

  const dataRows = rawRows.slice(1);

  if (dataRows.length > MAX_ROWS) {
    throw new Error(`A maximum of ${MAX_ROWS} transaction rows is allowed.`);
  }

  return dataRows.map((values, index) => {
    const errors = [];

    const date = parseDate(values[dateIndex]);
    const description = String(values[descriptionIndex] ?? "").trim();

    const amountText =
      amountIndex === -1 ? "" : String(values[amountIndex] ?? "").trim();

    const debitText =
      debitIndex === -1 ? "" : String(values[debitIndex] ?? "").trim();

    const creditText =
      creditIndex === -1 ? "" : String(values[creditIndex] ?? "").trim();

    let amount = null;
    let type = "UNKNOWN";

    const hasDebitCreditColumns =
      debitIndex !== -1 || creditIndex !== -1;

    const hasDebitCreditValues =
      debitText !== "" || creditText !== "";

    if (hasDebitCreditColumns && hasDebitCreditValues) {
      const debit = debitText === "" ? 0 : parseAmount(debitText);
      const credit = creditText === "" ? 0 : parseAmount(creditText);

      if (debit === null || credit === null) {
        errors.push("The debit or credit amount is invalid.");
      } else if (debit !== 0 && credit !== 0) {
        errors.push("Both debit and credit contain amounts.");
      } else if (debit !== 0) {
        amount = -Math.abs(debit);
        type = "EXPENSE";
      } else if (credit !== 0) {
        amount = Math.abs(credit);
        type = "INCOME";
      } else {
        amount = 0;
      }
    } else if (amountText !== "") {
      amount = parseAmount(amountText);

      if (amount !== null) {
        type = inferTransactionType(description, amount);
      }
    } else if (hasDebitCreditColumns) {
      // Blank debit/credit cells may represent a zero-value row,
      // but must not be interpreted as income.
      amount = 0;
    }

    if (!date) errors.push("Missing or invalid date.");
    if (!description) errors.push("Missing transaction description.");

    if (amount === null) {
      errors.push("Missing or invalid amount.");
    } else if (amount === 0) {
      errors.push("Zero-value transactions are not imported.");
    }

    if (amount !== null && amount !== 0 && type === "UNKNOWN") {
      errors.push(
        "Could not determine whether this transaction is income or expense. Review the description or use separate debit and credit columns."
      );
    }

    const valid = errors.length === 0 && type !== "UNKNOWN";

    return {
      lineNumber: index + 2,
      date,
      description,
      amount,
      type,
      category:
        valid && description
          ? inferCategory(description, type)
          : "Uncategorized",
      merchant: description || null,
      fingerprint:
        date && description && amount !== null && amount !== 0
          ? fingerprintFor({ date, description, amount })
          : null,
      valid,
      errors,
      isDuplicate: false,
    };
  });
}

/**
 * Mark duplicates already in the database and repeated rows within
 * the same CSV file.
 */
async function markDuplicates(userId, rows) {
  const fingerprints = [
    ...new Set(
      rows
        .filter((row) => row.valid && row.fingerprint)
        .map((row) => row.fingerprint)
    ),
  ];

  const existing = fingerprints.length
    ? await prisma.transaction.findMany({
        where: {
          userId,
          fingerprint: { in: fingerprints },
        },
        select: { fingerprint: true },
      })
    : [];

  const existingFingerprints = new Set(
    existing.map((transaction) => transaction.fingerprint)
  );

  const seenInFile = new Set();

  return rows.map((row) => {
    if (!row.fingerprint || !row.valid) {
      return row;
    }

    const alreadyInDatabase = existingFingerprints.has(row.fingerprint);
    const repeatedInFile = seenInFile.has(row.fingerprint);

    seenInFile.add(row.fingerprint);

    return {
      ...row,
      isDuplicate: alreadyInDatabase || repeatedInFile,
    };
  });
}

/**
 * Remove internal fields before returning a row to the client.
 */
function publicRow(row) {
  return {
    lineNumber: row.lineNumber,
    date: row.date ? row.date.toISOString() : null,
    description: row.description,
    amount: row.amount,
    type: row.type,
    category: row.category,
    merchant: row.merchant,
    valid: row.valid,
    errors: row.errors,
    isDuplicate: row.isDuplicate,
  };
}

/**
 * POST /api/transactions/import/preview
 *
 * Request:
 * {
 *   "fileName": "statement.csv",
 *   "csvText": "Date,Description,Amount..."
 * }
 */
async function previewImport(req, res) {
  try {
    const { csvText, fileName } = req.body ?? {};

    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      !fileName.toLowerCase().endsWith(".csv")
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid CSV file name.",
      });
    }

    const parsed = parseStatement(csvText);
    const rows = await markDuplicates(req.userId, parsed);

    const validRows = rows.filter((row) => row.valid);
    const invalidRows = rows.filter((row) => !row.valid);
    const duplicateRows = rows.filter(
      (row) => row.valid && row.isDuplicate
    );

    const importableRows = rows.filter(
      (row) => row.valid && !row.isDuplicate
    );

    return res.status(200).json({
      success: true,
      fileName: fileName.trim().slice(0, 255),
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        importableRows: importableRows.length,
      },
      rows: rows.map(publicRow),
    });
  } catch (error) {
    console.error("CSV preview error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to preview this CSV file.",
    });
  }
}

/**
 * POST /api/transactions/import/confirm
 *
 * Request:
 * {
 *   "fileName": "statement.csv",
 *   "csvText": "Date,Description,Amount...",
 *   "selectedLineNumbers": [2, 3, 4]
 * }
 *
 * The server reparses the original CSV and never trusts transaction
 * amounts, categories, types, or fingerprints supplied by the browser.
 */
async function confirmImport(req, res) {
  try {
    const { csvText, fileName, selectedLineNumbers } = req.body ?? {};

    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      !fileName.toLowerCase().endsWith(".csv")
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid CSV file name.",
      });
    }

    if (
      !Array.isArray(selectedLineNumbers) ||
      selectedLineNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one transaction to import.",
      });
    }

    if (
      selectedLineNumbers.some(
        (lineNumber) =>
          !Number.isInteger(lineNumber) || lineNumber < 2
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "The selected row numbers are invalid.",
      });
    }

    const selected = new Set(selectedLineNumbers);

    if (selected.size !== selectedLineNumbers.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate row selections are not allowed.",
      });
    }

    const parsed = parseStatement(csvText);
    const rows = await markDuplicates(req.userId, parsed);

    const requestedRows = rows.filter((row) =>
      selected.has(row.lineNumber)
    );

    if (requestedRows.length !== selected.size) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected rows do not exist in this statement.",
      });
    }

    const invalidSelected = requestedRows.filter((row) => !row.valid);

    if (invalidSelected.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Some selected rows are invalid. Correct or deselect them before importing.",
        rows: invalidSelected.map(publicRow),
      });
    }

    const duplicateSelected = requestedRows.filter(
      (row) => row.isDuplicate
    );

    if (duplicateSelected.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Some selected transactions are duplicates. Refresh the preview and deselect them.",
        rows: duplicateSelected.map(publicRow),
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const statementImport = await tx.statementImport.create({
        data: {
          fileName: fileName.trim().slice(0, 255),
          totalRows: rows.length,
          importedRows: 0,
          skippedRows: rows.length,
          userId: req.userId,
        },
      });

      const createResult = await tx.transaction.createMany({
        data: requestedRows.map((row) => ({
          date: row.date,
          description: row.description,
          amount: row.amount.toFixed(2),
          type: row.type,
          category: row.category,
          merchant: row.merchant,
          fingerprint: row.fingerprint,
          userId: req.userId,
          importId: statementImport.id,
        })),
        skipDuplicates: true,
      });

      await tx.statementImport.update({
        where: { id: statementImport.id },
        data: {
          importedRows: createResult.count,
          skippedRows: rows.length - createResult.count,
        },
      });

      return {
        importId: statementImport.id,
        importedRows: createResult.count,
        skippedRows: rows.length - createResult.count,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Statement import completed.",
      importId: result.importId,
      summary: {
        totalRows: rows.length,
        importedRows: result.importedRows,
        skippedRows: result.skippedRows,
      },
    });
  } catch (error) {
    console.error("CSV import error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to import this statement.",
    });
  }
}

/**
 * GET /api/transactions
 *
 * Returns the authenticated user's latest 500 transactions.
 */
async function listTransactions(req, res) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        type: true,
        category: true,
        merchant: true,
        importId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      transactions: transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    });
  } catch (error) {
    console.error("List transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve transactions.",
    });
  }
}

module.exports = {
  previewImport,
  confirmImport,
  listTransactions,
};
