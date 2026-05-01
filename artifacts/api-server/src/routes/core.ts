import { Router } from "express";
import { db } from "@workspace/db";
import {
  warehousesTable,
  sectorsTable,
  machinesTable,
  operationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/warehouses", async (_req, res) => {
  try {
    const rows = await db.select().from(warehousesTable).orderBy(warehousesTable.name);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.get("/warehouses/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Almoxarifado não encontrado" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.post("/warehouses", async (req, res) => {
  try {
    const [row] = await db.insert(warehousesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.put("/warehouses/:id", async (req, res) => {
  try {
    const [row] = await db.update(warehousesTable).set(req.body).where(eq(warehousesTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Almoxarifado não encontrado" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.delete("/warehouses/:id", async (req, res) => {
  try {
    const [row] = await db.delete(warehousesTable).where(eq(warehousesTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Almoxarifado não encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

router.get("/sectors", async (_req, res) => {
  try {
    const rows = await db.select().from(sectorsTable).orderBy(sectorsTable.name);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.get("/sectors/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Setor não encontrado" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.post("/sectors", async (req, res) => {
  try {
    const [row] = await db.insert(sectorsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.put("/sectors/:id", async (req, res) => {
  try {
    const [row] = await db.update(sectorsTable).set(req.body).where(eq(sectorsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Setor não encontrado" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.delete("/sectors/:id", async (req, res) => {
  try {
    const [row] = await db.delete(sectorsTable).where(eq(sectorsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Setor não encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

router.get("/machines", async (_req, res) => {
  try {
    const rows = await db.select().from(machinesTable).orderBy(machinesTable.name);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.get("/machines/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(machinesTable).where(eq(machinesTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Máquina não encontrada" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.post("/machines", async (req, res) => {
  try {
    const [row] = await db.insert(machinesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.put("/machines/:id", async (req, res) => {
  try {
    const [row] = await db.update(machinesTable).set(req.body).where(eq(machinesTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Máquina não encontrada" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.delete("/machines/:id", async (req, res) => {
  try {
    const [row] = await db.delete(machinesTable).where(eq(machinesTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Máquina não encontrada" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

router.get("/operations", async (_req, res) => {
  try {
    const rows = await db.select().from(operationsTable).orderBy(operationsTable.name);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.get("/operations/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(operationsTable).where(eq(operationsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Operação não encontrada" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.post("/operations", async (req, res) => {
  try {
    const [row] = await db.insert(operationsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.put("/operations/:id", async (req, res) => {
  try {
    const [row] = await db.update(operationsTable).set(req.body).where(eq(operationsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Operação não encontrada" });
    res.json(row);
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});
router.delete("/operations/:id", async (req, res) => {
  try {
    const [row] = await db.delete(operationsTable).where(eq(operationsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Operação não encontrada" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

export default router;
