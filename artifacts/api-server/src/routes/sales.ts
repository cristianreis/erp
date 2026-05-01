import { Router } from "express";
import { db } from "@workspace/db";
import {
  salesOrdersTable,
  salesOrderItemsTable,
  shipmentsTable,
  customersTable,
  productsTable,
  stockBalancesTable,
  stockReservationsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

let orderCounter = 1000;
const nextOrderNumber = () => `PV-${String(++orderCounter).padStart(5, "0")}`;

router.get("/sales-orders", async (req, res) => {
  try {
    const { status, customerId } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(salesOrdersTable.status, status as any));
    if (customerId) conditions.push(eq(salesOrdersTable.customerId, customerId));
    const rows = await db
      .select({
        id: salesOrdersTable.id,
        orderNumber: salesOrdersTable.orderNumber,
        customerId: salesOrdersTable.customerId,
        customerName: customersTable.name,
        orderDate: salesOrdersTable.orderDate,
        expectedDeliveryDate: salesOrdersTable.expectedDeliveryDate,
        status: salesOrdersTable.status,
        totalAmount: salesOrdersTable.totalAmount,
        notes: salesOrdersTable.notes,
        createdAt: salesOrdersTable.createdAt,
        updatedAt: salesOrdersTable.updatedAt,
      })
      .from(salesOrdersTable)
      .leftJoin(customersTable, eq(salesOrdersTable.customerId, customersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(salesOrdersTable.orderDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/sales-orders/:id", async (req, res) => {
  try {
    const [order] = await db
      .select({
        id: salesOrdersTable.id,
        orderNumber: salesOrdersTable.orderNumber,
        customerId: salesOrdersTable.customerId,
        customerName: customersTable.name,
        orderDate: salesOrdersTable.orderDate,
        expectedDeliveryDate: salesOrdersTable.expectedDeliveryDate,
        status: salesOrdersTable.status,
        totalAmount: salesOrdersTable.totalAmount,
        notes: salesOrdersTable.notes,
        createdAt: salesOrdersTable.createdAt,
        updatedAt: salesOrdersTable.updatedAt,
      })
      .from(salesOrdersTable)
      .leftJoin(customersTable, eq(salesOrdersTable.customerId, customersTable.id))
      .where(eq(salesOrdersTable.id, req.params.id));
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    const items = await db
      .select({
        id: salesOrderItemsTable.id,
        salesOrderId: salesOrderItemsTable.salesOrderId,
        productId: salesOrderItemsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        productUnit: productsTable.unit,
        quantity: salesOrderItemsTable.quantity,
        unitPrice: salesOrderItemsTable.unitPrice,
        totalPrice: salesOrderItemsTable.totalPrice,
        availableAtOrderTime: salesOrderItemsTable.availableAtOrderTime,
        reservedQuantity: salesOrderItemsTable.reservedQuantity,
        deliveredQuantity: salesOrderItemsTable.deliveredQuantity,
        status: salesOrderItemsTable.status,
      })
      .from(salesOrderItemsTable)
      .leftJoin(productsTable, eq(salesOrderItemsTable.productId, productsTable.id))
      .where(eq(salesOrderItemsTable.salesOrderId, req.params.id));
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/sales-orders", async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const orderNumber = orderData.orderNumber || nextOrderNumber();
    const [order] = await db.insert(salesOrdersTable).values({ ...orderData, orderNumber }).returning();
    if (items?.length) {
      await db.insert(salesOrderItemsTable).values(items.map((i: any) => ({
        ...i,
        salesOrderId: order.id,
        totalPrice: String(parseFloat(i.quantity) * parseFloat(i.unitPrice)),
      })));
    }
    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/sales-orders/:id", async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const [order] = await db.update(salesOrdersTable).set({ ...orderData, updatedAt: new Date() }).where(eq(salesOrdersTable.id, req.params.id)).returning();
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/sales-orders/:id", async (req, res) => {
  try {
    await db.delete(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, req.params.id));
    const [row] = await db.delete(salesOrdersTable).where(eq(salesOrdersTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/sales-orders/:id/approve", async (req, res) => {
  try {
    const [order] = await db.update(salesOrdersTable).set({ status: "aprovado", updatedAt: new Date() }).where(eq(salesOrdersTable.id, req.params.id)).returning();
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/sales-orders/:id/reserve", async (req, res) => {
  try {
    const items = await db.select().from(salesOrderItemsTable).where(eq(salesOrderItemsTable.salesOrderId, req.params.id));
    for (const item of items) {
      await db.update(salesOrderItemsTable).set({ status: "reservado", reservedQuantity: item.quantity }).where(eq(salesOrderItemsTable.id, item.id));
      await db.insert(stockReservationsTable).values({
        salesOrderId: req.params.id,
        salesOrderItemId: item.id,
        productId: item.productId,
        warehouseId: req.body.warehouseId,
        quantity: item.quantity,
      });
    }
    const [order] = await db.update(salesOrdersTable).set({ status: "reservado", updatedAt: new Date() }).where(eq(salesOrdersTable.id, req.params.id)).returning();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/sales-orders/:id/availability", async (req, res) => {
  try {
    const items = await db
      .select({
        itemId: salesOrderItemsTable.id,
        productId: salesOrderItemsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        requiredQty: salesOrderItemsTable.quantity,
      })
      .from(salesOrderItemsTable)
      .leftJoin(productsTable, eq(salesOrderItemsTable.productId, productsTable.id))
      .where(eq(salesOrderItemsTable.salesOrderId, req.params.id));

    const result = await Promise.all(items.map(async (item) => {
      const balances = await db.select().from(stockBalancesTable).where(eq(stockBalancesTable.productId, item.productId));
      const available = balances.reduce((sum, b) => sum + parseFloat(b.quantity || "0") - parseFloat(b.reservedQuantity || "0"), 0);
      return { ...item, availableQty: available, shortage: Math.max(0, parseFloat(String(item.requiredQty)) - available) };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/shipments", async (req, res) => {
  try {
    const rows = await db.select().from(shipmentsTable).orderBy(shipmentsTable.shipmentDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/shipments", async (req, res) => {
  try {
    const [row] = await db.insert(shipmentsTable).values(req.body).returning();
    await db.update(salesOrdersTable).set({ status: "expedido", updatedAt: new Date() }).where(eq(salesOrdersTable.id, req.body.salesOrderId));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
