import { Router } from "express";
import { db } from "@workspace/db";
import {
  purchaseRequestsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  receiptsTable,
  receiptItemsTable,
  suppliersTable,
  productsTable,
  stockBalancesTable,
  stockMovementsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

let prCounter = 1000, poCounter = 1000, recCounter = 1000;
const nextPR = () => `SC-${String(++prCounter).padStart(5, "0")}`;
const nextPO = () => `PC-${String(++poCounter).padStart(5, "0")}`;
const nextRec = () => `REC-${String(++recCounter).padStart(5, "0")}`;

router.get("/purchase-requests", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const rows = await db
      .select({
        id: purchaseRequestsTable.id,
        requestNumber: purchaseRequestsTable.requestNumber,
        productId: purchaseRequestsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        quantity: purchaseRequestsTable.quantity,
        neededDate: purchaseRequestsTable.neededDate,
        source: purchaseRequestsTable.source,
        status: purchaseRequestsTable.status,
        notes: purchaseRequestsTable.notes,
        createdAt: purchaseRequestsTable.createdAt,
        updatedAt: purchaseRequestsTable.updatedAt,
      })
      .from(purchaseRequestsTable)
      .leftJoin(productsTable, eq(purchaseRequestsTable.productId, productsTable.id))
      .where(status ? eq(purchaseRequestsTable.status, status as any) : undefined)
      .orderBy(purchaseRequestsTable.createdAt);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-requests", async (req, res) => {
  try {
    const requestNumber = req.body.requestNumber || nextPR();
    const [row] = await db.insert(purchaseRequestsTable).values({ ...req.body, requestNumber }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/purchase-requests/:id", async (req, res) => {
  try {
    const [row] = await db.update(purchaseRequestsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(purchaseRequestsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Solicitação não encontrada" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/purchase-orders", async (req, res) => {
  try {
    const { status, supplierId } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(purchaseOrdersTable.status, status as any));
    if (supplierId) conditions.push(eq(purchaseOrdersTable.supplierId, supplierId));
    const rows = await db
      .select({
        id: purchaseOrdersTable.id,
        orderNumber: purchaseOrdersTable.orderNumber,
        supplierId: purchaseOrdersTable.supplierId,
        supplierName: suppliersTable.name,
        orderDate: purchaseOrdersTable.orderDate,
        expectedDate: purchaseOrdersTable.expectedDate,
        status: purchaseOrdersTable.status,
        totalAmount: purchaseOrdersTable.totalAmount,
        notes: purchaseOrdersTable.notes,
        createdAt: purchaseOrdersTable.createdAt,
        updatedAt: purchaseOrdersTable.updatedAt,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(purchaseOrdersTable.orderDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/purchase-orders/:id", async (req, res) => {
  try {
    const [order] = await db
      .select({
        id: purchaseOrdersTable.id,
        orderNumber: purchaseOrdersTable.orderNumber,
        supplierId: purchaseOrdersTable.supplierId,
        supplierName: suppliersTable.name,
        orderDate: purchaseOrdersTable.orderDate,
        expectedDate: purchaseOrdersTable.expectedDate,
        status: purchaseOrdersTable.status,
        totalAmount: purchaseOrdersTable.totalAmount,
        notes: purchaseOrdersTable.notes,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
      .where(eq(purchaseOrdersTable.id, req.params.id));
    if (!order) return res.status(404).json({ error: "Pedido de compra não encontrado" });
    const items = await db
      .select({
        id: purchaseOrderItemsTable.id,
        productId: purchaseOrderItemsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        quantity: purchaseOrderItemsTable.quantity,
        receivedQuantity: purchaseOrderItemsTable.receivedQuantity,
        unitPrice: purchaseOrderItemsTable.unitPrice,
        totalPrice: purchaseOrderItemsTable.totalPrice,
      })
      .from(purchaseOrderItemsTable)
      .leftJoin(productsTable, eq(purchaseOrderItemsTable.productId, productsTable.id))
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, req.params.id));
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-orders", async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const orderNumber = orderData.orderNumber || nextPO();
    const [order] = await db.insert(purchaseOrdersTable).values({ ...orderData, orderNumber }).returning();
    if (items?.length) {
      await db.insert(purchaseOrderItemsTable).values(items.map((i: any) => ({
        ...i,
        purchaseOrderId: order.id,
        totalPrice: String(parseFloat(i.quantity) * parseFloat(i.unitPrice)),
      })));
    }
    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/purchase-orders/:id", async (req, res) => {
  try {
    const [row] = await db.update(purchaseOrdersTable).set({ ...req.body, updatedAt: new Date() }).where(eq(purchaseOrdersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Pedido de compra não encontrado" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/receipts", async (req, res) => {
  try {
    const rows = await db.select().from(receiptsTable).orderBy(receiptsTable.receiptDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/receipts", async (req, res) => {
  try {
    const { items, ...receiptData } = req.body;
    const receiptNumber = receiptData.receiptNumber || nextRec();
    const [receipt] = await db.insert(receiptsTable).values({ ...receiptData, receiptNumber }).returning();

    if (items?.length) {
      for (const item of items) {
        await db.insert(receiptItemsTable).values({ ...item, receiptId: receipt.id });
        const existingBalances = await db
          .select()
          .from(stockBalancesTable)
          .where(and(
            eq(stockBalancesTable.productId, item.productId),
            eq(stockBalancesTable.warehouseId, item.warehouseId),
          ));
        if (existingBalances.length > 0) {
          const current = parseFloat(existingBalances[0].quantity || "0");
          await db.update(stockBalancesTable).set({
            quantity: String(current + parseFloat(item.quantity)),
            lastMovementAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(stockBalancesTable.id, existingBalances[0].id));
        } else {
          await db.insert(stockBalancesTable).values({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            lastMovementAt: new Date(),
          });
        }
        await db.insert(stockMovementsTable).values({
          productId: item.productId,
          warehouseId: item.warehouseId,
          movementType: "entrada_compra",
          quantity: item.quantity,
          destinationStatus: "disponivel",
          referenceType: "receipt",
          referenceId: receipt.id,
        });
        if (item.purchaseOrderItemId) {
          const [poItem] = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.id, item.purchaseOrderItemId));
          if (poItem) {
            await db.update(purchaseOrderItemsTable).set({ receivedQuantity: String(parseFloat(poItem.receivedQuantity || "0") + parseFloat(item.quantity)) }).where(eq(purchaseOrderItemsTable.id, item.purchaseOrderItemId));
          }
        }
      }
      await db.update(purchaseOrdersTable).set({ status: "recebido_parcial", updatedAt: new Date() }).where(eq(purchaseOrdersTable.id, receiptData.purchaseOrderId));
    }

    res.status(201).json(receipt);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
