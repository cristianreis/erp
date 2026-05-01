import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, suppliersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(customersTable)
      .where(search ? ilike(customersTable.name, `%${search}%`) : undefined)
      .orderBy(customersTable.name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(customersTable).where(eq(customersTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const [row] = await db.insert(customersTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/customers/:id", async (req, res) => {
  try {
    const [row] = await db.update(customersTable).set({ ...req.body, updatedAt: new Date() }).where(eq(customersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const [row] = await db.delete(customersTable).where(eq(customersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/suppliers", async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(suppliersTable)
      .where(search ? ilike(suppliersTable.name, `%${search}%`) : undefined)
      .orderBy(suppliersTable.name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/suppliers/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Fornecedor não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const [row] = await db.insert(suppliersTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/suppliers/:id", async (req, res) => {
  try {
    const [row] = await db.update(suppliersTable).set({ ...req.body, updatedAt: new Date() }).where(eq(suppliersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Fornecedor não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/suppliers/:id", async (req, res) => {
  try {
    const [row] = await db.delete(suppliersTable).where(eq(suppliersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Fornecedor não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
