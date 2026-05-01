import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productCategoriesTable,
} from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const { search, itemType, active } = req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (itemType) conditions.push(eq(productsTable.itemType, itemType as any));
    if (active !== undefined) conditions.push(eq(productsTable.active, active === "true"));
    const rows = await db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(productsTable.code);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const [row] = await db.insert(productsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) {
    req.log.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Código já existe" });
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(productsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(productsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const [row] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Produto não encontrado" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/product-categories", async (_req, res) => {
  try {
    const rows = await db.select().from(productCategoriesTable).orderBy(productCategoriesTable.name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/product-categories", async (req, res) => {
  try {
    const [row] = await db.insert(productCategoriesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
