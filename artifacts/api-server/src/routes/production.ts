import { Router } from "express";
import { db } from "@workspace/db";
import {
  productionOrdersTable,
  productionOrderMaterialsTable,
  productionOrderOperationsTable,
  productionAppointmentsTable,
  productsTable,
  machinesTable,
  operationsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

let opCounter = 1000;
const nextOP = () => `OP-${String(++opCounter).padStart(5, "0")}`;

router.get("/production-orders", async (req, res) => {
  try {
    const { status, orderType } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(productionOrdersTable.status, status as any));
    if (orderType) conditions.push(eq(productionOrdersTable.orderType, orderType as any));
    const rows = await db
      .select({
        id: productionOrdersTable.id,
        orderNumber: productionOrdersTable.orderNumber,
        productId: productionOrdersTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        salesOrderId: productionOrdersTable.salesOrderId,
        quantityPlanned: productionOrdersTable.quantityPlanned,
        quantityProduced: productionOrdersTable.quantityProduced,
        quantityRejected: productionOrdersTable.quantityRejected,
        orderType: productionOrdersTable.orderType,
        status: productionOrdersTable.status,
        priority: productionOrdersTable.priority,
        plannedStartDate: productionOrdersTable.plannedStartDate,
        plannedEndDate: productionOrdersTable.plannedEndDate,
        actualStartDate: productionOrdersTable.actualStartDate,
        actualEndDate: productionOrdersTable.actualEndDate,
        notes: productionOrdersTable.notes,
        createdAt: productionOrdersTable.createdAt,
        updatedAt: productionOrdersTable.updatedAt,
      })
      .from(productionOrdersTable)
      .leftJoin(productsTable, eq(productionOrdersTable.productId, productsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(productionOrdersTable.plannedStartDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/production-orders/:id", async (req, res) => {
  try {
    const [order] = await db
      .select({
        id: productionOrdersTable.id,
        orderNumber: productionOrdersTable.orderNumber,
        productId: productionOrdersTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        salesOrderId: productionOrdersTable.salesOrderId,
        quantityPlanned: productionOrdersTable.quantityPlanned,
        quantityProduced: productionOrdersTable.quantityProduced,
        quantityRejected: productionOrdersTable.quantityRejected,
        orderType: productionOrdersTable.orderType,
        status: productionOrdersTable.status,
        priority: productionOrdersTable.priority,
        plannedStartDate: productionOrdersTable.plannedStartDate,
        plannedEndDate: productionOrdersTable.plannedEndDate,
        actualStartDate: productionOrdersTable.actualStartDate,
        actualEndDate: productionOrdersTable.actualEndDate,
        notes: productionOrdersTable.notes,
      })
      .from(productionOrdersTable)
      .leftJoin(productsTable, eq(productionOrdersTable.productId, productsTable.id))
      .where(eq(productionOrdersTable.id, req.params.id));
    if (!order) return res.status(404).json({ error: "Ordem de produção não encontrada" });

    const materials = await db
      .select({
        id: productionOrderMaterialsTable.id,
        productId: productionOrderMaterialsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        requiredQuantity: productionOrderMaterialsTable.requiredQuantity,
        issuedQuantity: productionOrderMaterialsTable.issuedQuantity,
        consumedQuantity: productionOrderMaterialsTable.consumedQuantity,
        status: productionOrderMaterialsTable.status,
      })
      .from(productionOrderMaterialsTable)
      .leftJoin(productsTable, eq(productionOrderMaterialsTable.productId, productsTable.id))
      .where(eq(productionOrderMaterialsTable.productionOrderId, req.params.id));

    const ops = await db
      .select({
        id: productionOrderOperationsTable.id,
        sequenceNumber: productionOrderOperationsTable.sequenceNumber,
        operationId: productionOrderOperationsTable.operationId,
        operationName: operationsTable.name,
        machineId: productionOrderOperationsTable.machineId,
        machineName: machinesTable.name,
        plannedTimeMinutes: productionOrderOperationsTable.plannedTimeMinutes,
        actualTimeMinutes: productionOrderOperationsTable.actualTimeMinutes,
        status: productionOrderOperationsTable.status,
        startedAt: productionOrderOperationsTable.startedAt,
        finishedAt: productionOrderOperationsTable.finishedAt,
        notes: productionOrderOperationsTable.notes,
      })
      .from(productionOrderOperationsTable)
      .leftJoin(operationsTable, eq(productionOrderOperationsTable.operationId, operationsTable.id))
      .leftJoin(machinesTable, eq(productionOrderOperationsTable.machineId, machinesTable.id))
      .where(eq(productionOrderOperationsTable.productionOrderId, req.params.id))
      .orderBy(productionOrderOperationsTable.sequenceNumber);

    res.json({ ...order, materials, operations: ops });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/production-orders", async (req, res) => {
  try {
    const { materials, operations, ...orderData } = req.body;
    const orderNumber = orderData.orderNumber || nextOP();
    const [order] = await db.insert(productionOrdersTable).values({ ...orderData, orderNumber }).returning();
    if (materials?.length) {
      await db.insert(productionOrderMaterialsTable).values(materials.map((m: any) => ({ ...m, productionOrderId: order.id })));
    }
    if (operations?.length) {
      await db.insert(productionOrderOperationsTable).values(operations.map((o: any) => ({ ...o, productionOrderId: order.id })));
    }
    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/production-orders/:id", async (req, res) => {
  try {
    const { materials, operations, ...orderData } = req.body;
    const [order] = await db.update(productionOrdersTable).set({ ...orderData, updatedAt: new Date() }).where(eq(productionOrdersTable.id, req.params.id)).returning();
    if (!order) return res.status(404).json({ error: "Ordem de produção não encontrada" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/production-orders/:id", async (req, res) => {
  try {
    await db.delete(productionOrderMaterialsTable).where(eq(productionOrderMaterialsTable.productionOrderId, req.params.id));
    await db.delete(productionOrderOperationsTable).where(eq(productionOrderOperationsTable.productionOrderId, req.params.id));
    const [row] = await db.delete(productionOrdersTable).where(eq(productionOrdersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Ordem de produção não encontrada" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/production-orders/:id/start", async (req, res) => {
  try {
    const [order] = await db.update(productionOrdersTable).set({ status: "em_producao", actualStartDate: new Date(), updatedAt: new Date() }).where(eq(productionOrdersTable.id, req.params.id)).returning();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/production-orders/:id/finish", async (req, res) => {
  try {
    const { quantityProduced, quantityRejected } = req.body;
    const [order] = await db.update(productionOrdersTable).set({
      status: "finalizada",
      quantityProduced: String(quantityProduced),
      quantityRejected: String(quantityRejected || 0),
      actualEndDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(productionOrdersTable.id, req.params.id)).returning();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/production-appointments", async (req, res) => {
  try {
    const { productionOrderId } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(productionAppointmentsTable)
      .where(productionOrderId ? eq(productionAppointmentsTable.productionOrderId, productionOrderId) : undefined)
      .orderBy(productionAppointmentsTable.startTime);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/production-appointments", async (req, res) => {
  try {
    const [row] = await db.insert(productionAppointmentsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
