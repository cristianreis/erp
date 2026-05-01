import { Router } from "express";
import { db } from "@workspace/db";
import {
  qualityInspectionsTable,
  productsTable,
  productionOrdersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/quality/inspections", async (req, res) => {
  try {
    const { productionOrderId, status } = req.query as Record<string, string>;
    const rows = await db
      .select({
        id: qualityInspectionsTable.id,
        productId: qualityInspectionsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        productionOrderId: qualityInspectionsTable.productionOrderId,
        inspectionDate: qualityInspectionsTable.inspectionDate,
        inspectedQuantity: qualityInspectionsTable.inspectedQuantity,
        approvedQuantity: qualityInspectionsTable.approvedQuantity,
        rejectedQuantity: qualityInspectionsTable.rejectedQuantity,
        status: qualityInspectionsTable.status,
        scrapAction: qualityInspectionsTable.scrapAction,
        reworkAction: qualityInspectionsTable.reworkAction,
        notes: qualityInspectionsTable.notes,
        createdAt: qualityInspectionsTable.createdAt,
      })
      .from(qualityInspectionsTable)
      .leftJoin(productsTable, eq(qualityInspectionsTable.productId, productsTable.id))
      .where(productionOrderId ? eq(qualityInspectionsTable.productionOrderId, productionOrderId) : undefined);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/quality/inspections/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(qualityInspectionsTable)
      .where(eq(qualityInspectionsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Inspeção não encontrada" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/quality/inspections", async (req, res) => {
  try {
    const [row] = await db.insert(qualityInspectionsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/quality/inspections/:id", async (req, res) => {
  try {
    const [row] = await db.update(qualityInspectionsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(qualityInspectionsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Inspeção não encontrada" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
