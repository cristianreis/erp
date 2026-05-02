import { Router } from "express";
import { db } from "@workspace/db";
import {
  bomHeadersTable,
  bomItemsTable,
  routingsTable,
  routingOperationsTable,
  productDocumentsTable,
  productsTable,
  operationsTable,
  machinesTable,
  sectorsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ─── BOM ─────────────────────────────────────────────────────────────────────

router.get("/bom", async (req, res) => {
  try {
    const { parentProductId } = req.query as Record<string, string>;
    const rows = await db
      .select({
        id: bomHeadersTable.id,
        parentProductId: bomHeadersTable.parentProductId,
        productCode: productsTable.code,
        productName: productsTable.name,
        version: bomHeadersTable.version,
        description: bomHeadersTable.description,
        active: bomHeadersTable.active,
        validFrom: bomHeadersTable.validFrom,
        validTo: bomHeadersTable.validTo,
        createdAt: bomHeadersTable.createdAt,
        updatedAt: bomHeadersTable.updatedAt,
      })
      .from(bomHeadersTable)
      .leftJoin(productsTable, eq(bomHeadersTable.parentProductId, productsTable.id))
      .where(parentProductId ? eq(bomHeadersTable.parentProductId, parentProductId) : undefined);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/bom/:id", async (req, res) => {
  try {
    const [header] = await db
      .select({
        id: bomHeadersTable.id,
        parentProductId: bomHeadersTable.parentProductId,
        productCode: productsTable.code,
        productName: productsTable.name,
        version: bomHeadersTable.version,
        description: bomHeadersTable.description,
        active: bomHeadersTable.active,
        validFrom: bomHeadersTable.validFrom,
        validTo: bomHeadersTable.validTo,
      })
      .from(bomHeadersTable)
      .leftJoin(productsTable, eq(bomHeadersTable.parentProductId, productsTable.id))
      .where(eq(bomHeadersTable.id, req.params.id));
    if (!header) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    const items = await db
      .select({
        id: bomItemsTable.id,
        bomHeaderId: bomItemsTable.bomHeaderId,
        componentProductId: bomItemsTable.componentProductId,
        componentCode: productsTable.code,
        componentName: productsTable.name,
        quantityPerParent: bomItemsTable.quantityPerParent,
        scrapPercentage: bomItemsTable.scrapPercentage,
        isMandatory: bomItemsTable.isMandatory,
        notes: bomItemsTable.notes,
      })
      .from(bomItemsTable)
      .leftJoin(productsTable, eq(bomItemsTable.componentProductId, productsTable.id))
      .where(eq(bomItemsTable.bomHeaderId, req.params.id));
    res.json({ ...header, items });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/bom", async (req, res) => {
  try {
    const { items, ...headerData } = req.body;
    const [header] = await db.insert(bomHeadersTable).values(headerData).returning();
    if (items?.length) {
      await db.insert(bomItemsTable).values(items.map((i: any) => ({ ...i, bomHeaderId: header.id })));
    }
    res.status(201).json(header);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/bom/:id", async (req, res) => {
  try {
    const { items, ...headerData } = req.body;
    const [header] = await db.update(bomHeadersTable).set({ ...headerData, updatedAt: new Date() }).where(eq(bomHeadersTable.id, req.params.id)).returning();
    if (!header) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    if (items !== undefined) {
      await db.delete(bomItemsTable).where(eq(bomItemsTable.bomHeaderId, req.params.id));
      if (items.length) {
        await db.insert(bomItemsTable).values(items.map((i: any) => ({ ...i, bomHeaderId: header.id })));
      }
    }
    res.json(header);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/bom/:id", async (req, res) => {
  try {
    await db.delete(bomItemsTable).where(eq(bomItemsTable.bomHeaderId, req.params.id));
    const [row] = await db.delete(bomHeadersTable).where(eq(bomHeadersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Ficha técnica não encontrada" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/bom/:id/items", async (req, res) => {
  try {
    const [row] = await db.insert(bomItemsTable).values({ ...req.body, bomHeaderId: req.params.id }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/bom/items/:itemId", async (req, res) => {
  try {
    const [row] = await db.update(bomItemsTable).set(req.body).where(eq(bomItemsTable.id, req.params.itemId)).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/bom/items/:itemId", async (req, res) => {
  try {
    await db.delete(bomItemsTable).where(eq(bomItemsTable.id, req.params.itemId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── ROUTINGS ────────────────────────────────────────────────────────────────

router.get("/routings", async (req, res) => {
  try {
    const { productId } = req.query as Record<string, string>;
    const rows = await db
      .select({
        id: routingsTable.id,
        productId: routingsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        version: routingsTable.version,
        description: routingsTable.description,
        active: routingsTable.active,
        createdAt: routingsTable.createdAt,
        updatedAt: routingsTable.updatedAt,
      })
      .from(routingsTable)
      .leftJoin(productsTable, eq(routingsTable.productId, productsTable.id))
      .where(productId ? eq(routingsTable.productId, productId) : undefined);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/routings/:id", async (req, res) => {
  try {
    const [routing] = await db
      .select()
      .from(routingsTable)
      .where(eq(routingsTable.id, req.params.id));
    if (!routing) return res.status(404).json({ error: "Roteiro não encontrado" });
    const ops = await db
      .select({
        id: routingOperationsTable.id,
        routingId: routingOperationsTable.routingId,
        sequenceNumber: routingOperationsTable.sequenceNumber,
        operationId: routingOperationsTable.operationId,
        operationName: operationsTable.name,
        machineId: routingOperationsTable.machineId,
        machineName: machinesTable.name,
        sectorId: routingOperationsTable.sectorId,
        sectorName: sectorsTable.name,
        setupTimeMinutes: routingOperationsTable.setupTimeMinutes,
        standardTimeMinutes: routingOperationsTable.standardTimeMinutes,
        isExternal: routingOperationsTable.isExternal,
        tools: routingOperationsTable.tools,
        checklist: routingOperationsTable.checklist,
        notes: routingOperationsTable.notes,
      })
      .from(routingOperationsTable)
      .leftJoin(operationsTable, eq(routingOperationsTable.operationId, operationsTable.id))
      .leftJoin(machinesTable, eq(routingOperationsTable.machineId, machinesTable.id))
      .leftJoin(sectorsTable, eq(routingOperationsTable.sectorId, sectorsTable.id))
      .where(eq(routingOperationsTable.routingId, req.params.id))
      .orderBy(routingOperationsTable.sequenceNumber);
    res.json({ ...routing, operations: ops });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/routings", async (req, res) => {
  try {
    const { operations, ...routingData } = req.body;
    const [routing] = await db.insert(routingsTable).values(routingData).returning();
    if (operations?.length) {
      await db.insert(routingOperationsTable).values(operations.map((o: any) => ({ ...o, routingId: routing.id })));
    }
    res.status(201).json(routing);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/routings/:id", async (req, res) => {
  try {
    const { operations, ...routingData } = req.body;
    const [routing] = await db.update(routingsTable).set({ ...routingData, updatedAt: new Date() }).where(eq(routingsTable.id, req.params.id)).returning();
    if (!routing) return res.status(404).json({ error: "Roteiro não encontrado" });
    if (operations !== undefined) {
      await db.delete(routingOperationsTable).where(eq(routingOperationsTable.routingId, req.params.id));
      if (operations.length) {
        await db.insert(routingOperationsTable).values(operations.map((o: any) => ({ ...o, routingId: routing.id })));
      }
    }
    res.json(routing);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/routings/:id", async (req, res) => {
  try {
    await db.delete(routingOperationsTable).where(eq(routingOperationsTable.routingId, req.params.id));
    const [row] = await db.delete(routingsTable).where(eq(routingsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Roteiro não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── DOCUMENTOS ──────────────────────────────────────────────────────────────

router.get("/documents", async (req, res) => {
  try {
    const { productId, documentType, status } = req.query as Record<string, string>;
    let query = db
      .select({
        id: productDocumentsTable.id,
        productId: productDocumentsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        name: productDocumentsTable.name,
        description: productDocumentsTable.description,
        documentType: productDocumentsTable.documentType,
        revision: productDocumentsTable.revision,
        status: productDocumentsTable.status,
        objectPath: productDocumentsTable.objectPath,
        fileSize: productDocumentsTable.fileSize,
        mimeType: productDocumentsTable.mimeType,
        changeReason: productDocumentsTable.changeReason,
        responsiblePerson: productDocumentsTable.responsiblePerson,
        approvedBy: productDocumentsTable.approvedBy,
        approvedAt: productDocumentsTable.approvedAt,
        notes: productDocumentsTable.notes,
        createdAt: productDocumentsTable.createdAt,
        updatedAt: productDocumentsTable.updatedAt,
      })
      .from(productDocumentsTable)
      .leftJoin(productsTable, eq(productDocumentsTable.productId, productsTable.id))
      .$dynamic();

    if (productId) query = query.where(eq(productDocumentsTable.productId, productId));
    const rows = await query.orderBy(desc(productDocumentsTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const [row] = await db
      .select({
        id: productDocumentsTable.id,
        productId: productDocumentsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        name: productDocumentsTable.name,
        description: productDocumentsTable.description,
        documentType: productDocumentsTable.documentType,
        revision: productDocumentsTable.revision,
        status: productDocumentsTable.status,
        objectPath: productDocumentsTable.objectPath,
        fileSize: productDocumentsTable.fileSize,
        mimeType: productDocumentsTable.mimeType,
        changeReason: productDocumentsTable.changeReason,
        responsiblePerson: productDocumentsTable.responsiblePerson,
        approvedBy: productDocumentsTable.approvedBy,
        approvedAt: productDocumentsTable.approvedAt,
        notes: productDocumentsTable.notes,
        createdAt: productDocumentsTable.createdAt,
        updatedAt: productDocumentsTable.updatedAt,
      })
      .from(productDocumentsTable)
      .leftJoin(productsTable, eq(productDocumentsTable.productId, productsTable.id))
      .where(eq(productDocumentsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Documento não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const [row] = await db.insert(productDocumentsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/documents/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(productDocumentsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(productDocumentsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Documento não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const [row] = await db
      .delete(productDocumentsTable)
      .where(eq(productDocumentsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Documento não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
