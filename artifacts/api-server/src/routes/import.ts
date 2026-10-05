import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

interface CsvRow {
  name: string;
  sku: string;
  category: string;
  description?: string;
  quantity: string;
  price: string;
  reorderThreshold: string;
  supplier?: string;
}

const REQUIRED_COLUMNS = ["name", "sku", "category", "quantity", "price", "reorderThreshold"];

router.post("/products/import", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No CSV file uploaded. Send a multipart/form-data request with a 'file' field." });
    return;
  }
  if (!req.file.originalname.endsWith(".csv") && req.file.mimetype !== "text/csv") {
    res.status(400).json({ error: "Uploaded file must be a CSV." });
    return;
  }

  const rows: CsvRow[] = [];
  const errors: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(req.file!.buffer);
      stream
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on("data", (row: CsvRow) => rows.push(row))
        .on("error", reject)
        .on("end", resolve);
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse CSV: " + (err instanceof Error ? err.message : String(err)) });
    return;
  }

  if (rows.length === 0) {
    res.status(400).json({ error: "CSV file is empty or has no data rows." });
    return;
  }

  const headers = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    res.status(400).json({ error: `CSV is missing required columns: ${missing.join(", ")}` });
    return;
  }

  const validRows: typeof productsTable.$inferInsert[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    const qty = parseInt(row.quantity, 10);
    const price = parseFloat(row.price);
    const threshold = parseInt(row.reorderThreshold, 10);

    if (!row.name?.trim()) { errors.push(`Row ${lineNum}: 'name' is required`); continue; }
    if (!row.sku?.trim()) { errors.push(`Row ${lineNum}: 'sku' is required`); continue; }
    if (!row.category?.trim()) { errors.push(`Row ${lineNum}: 'category' is required`); continue; }
    if (isNaN(qty) || qty < 0) { errors.push(`Row ${lineNum}: 'quantity' must be a non-negative integer`); continue; }
    if (isNaN(price) || price < 0) { errors.push(`Row ${lineNum}: 'price' must be a non-negative number`); continue; }
    if (isNaN(threshold) || threshold < 0) { errors.push(`Row ${lineNum}: 'reorderThreshold' must be a non-negative integer`); continue; }

    validRows.push({
      name: row.name.trim(),
      sku: row.sku.trim(),
      category: row.category.trim(),
      description: row.description?.trim() || null,
      quantity: qty,
      price: String(price.toFixed(2)),
      reorderThreshold: threshold,
      supplier: row.supplier?.trim() || null,
    });
  }

  if (validRows.length === 0) {
    res.status(400).json({ error: "No valid rows to import.", details: errors });
    return;
  }

  let imported = 0;
  const importErrors: string[] = [...errors];

  for (const row of validRows) {
    try {
      await db
        .insert(productsTable)
        .values(row)
        .onConflictDoUpdate({
          target: productsTable.sku,
          set: {
            name: row.name,
            category: row.category,
            description: row.description,
            quantity: row.quantity,
            price: row.price,
            reorderThreshold: row.reorderThreshold,
            supplier: row.supplier,
            updatedAt: new Date(),
          },
        });
      imported++;
    } catch (err) {
      logger.error({ err, sku: row.sku }, "Failed to insert/update product during import");
      importErrors.push(`SKU '${row.sku}': ${err instanceof Error ? err.message : "database error"}`);
    }
  }

  res.json({
    imported,
    skipped: rows.length - validRows.length,
    errors: importErrors.length > 0 ? importErrors : undefined,
    message: `Successfully imported ${imported} product${imported !== 1 ? "s" : ""}.`,
  });
});

export default router;
