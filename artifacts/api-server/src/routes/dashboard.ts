import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { sql, lte, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const rows = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      totalStockValue: sql<number>`coalesce(sum(price * quantity), 0)::float`,
      lowStockCount: sql<number>`count(*) filter (where quantity <= reorder_threshold and quantity > 0)::int`,
      outOfStockCount: sql<number>`count(*) filter (where quantity = 0)::int`,
      totalQuantity: sql<number>`coalesce(sum(quantity), 0)::int`,
    })
    .from(productsTable);

  const row = rows[0] ?? {
    totalProducts: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalQuantity: 0,
  };

  res.json(row);
});

router.get("/dashboard/categories", async (_req, res) => {
  const rows = await db
    .select({
      category: productsTable.category,
      productCount: sql<number>`count(*)::int`,
      totalValue: sql<number>`coalesce(sum(price * quantity), 0)::float`,
      totalQuantity: sql<number>`coalesce(sum(quantity), 0)::int`,
    })
    .from(productsTable)
    .groupBy(productsTable.category)
    .orderBy(sql`count(*) desc`);

  res.json(rows);
});

router.get("/dashboard/low-stock", async (_req, res) => {
  const products = await db
    .select()
    .from(productsTable)
    .where(lte(productsTable.quantity, productsTable.reorderThreshold))
    .orderBy(productsTable.quantity);

  res.json(
    products.map((p) => ({
      ...p,
      price: Number(p.price),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
});

router.get("/dashboard/recent", async (_req, res) => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.createdAt))
    .limit(8);

  res.json(
    products.map((p) => ({
      ...p,
      price: Number(p.price),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
});

export default router;
