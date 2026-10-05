import { Router } from "express";
import { db, productsTable, insertProductSchema, updateProductSchema } from "@workspace/db";
import { eq, ilike, and, asc, desc, lte, gt } from "drizzle-orm";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res) => {
  const parseResult = ListProductsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const { search, category, lowStock, sortBy = "createdAt", sortOrder = "desc" } = parseResult.data;

  const conditions = [];
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }
  if (category) {
    conditions.push(eq(productsTable.category, category));
  }
  if (lowStock === true) {
    conditions.push(lte(productsTable.quantity, productsTable.reorderThreshold));
  }

  const orderCol = {
    name: productsTable.name,
    price: productsTable.price,
    quantity: productsTable.quantity,
    createdAt: productsTable.createdAt,
  }[sortBy] ?? productsTable.createdAt;

  const orderDir = sortOrder === "asc" ? asc(orderCol) : desc(orderCol);

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderDir);

  res.json(
    products.map((p) => ({
      ...p,
      price: Number(p.price),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
});

router.post("/products", async (req, res) => {
  const parseResult = CreateProductBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.message });
    return;
  }

  const data = parseResult.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      name: data.name,
      sku: data.sku,
      category: data.category,
      description: data.description ?? null,
      quantity: data.quantity,
      price: String(data.price),
      reorderThreshold: data.reorderThreshold,
      supplier: data.supplier ?? null,
    })
    .returning();

  res.status(201).json({
    ...product,
    price: Number(product.price),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.get("/products/:id", async (req, res) => {
  const parseResult = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, parseResult.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({
    ...product,
    price: Number(product.price),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.patch("/products/:id", async (req, res) => {
  const paramsResult = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const bodyResult = UpdateProductBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: bodyResult.error.message });
    return;
  }

  const data = bodyResult.data;
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.price !== undefined) updateData.price = String(data.price);
  if (data.reorderThreshold !== undefined) updateData.reorderThreshold = data.reorderThreshold;
  if (data.supplier !== undefined) updateData.supplier = data.supplier;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, paramsResult.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({
    ...product,
    price: Number(product.price),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.delete("/products/:id", async (req, res) => {
  const parseResult = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, parseResult.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.status(204).send();
});

export default router;
