import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  salesOrdersTable,
  productionOrdersTable,
  stockBalancesTable,
  stockMovementsTable,
  purchaseOrdersTable,
  customersTable,
  warehousesTable,
} from "@workspace/db";
import { eq, notInArray, sql, lt, lte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (_req, res) => {
  try {
    const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.active, true));
    const [activeOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(salesOrdersTable)
      .where(notInArray(salesOrdersTable.status, ["faturado", "cancelado", "expedido"]));
    const [activePOs] = await db.select({ count: sql<number>`count(*)::int` }).from(productionOrdersTable)
      .where(notInArray(productionOrdersTable.status, ["finalizada", "cancelada"]));
    const [openPurchaseOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrdersTable)
      .where(notInArray(purchaseOrdersTable.status, ["recebido_total", "cancelado"]));
    const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable).where(eq(customersTable.active, true));
    const [warehouseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(warehousesTable).where(eq(warehousesTable.active, true));

    res.json({
      totalProducts: productCount?.count ?? 0,
      activeSalesOrders: activeOrders?.count ?? 0,
      activeProductionOrders: activePOs?.count ?? 0,
      openPurchaseOrders: openPurchaseOrders?.count ?? 0,
      totalCustomers: customerCount?.count ?? 0,
      totalWarehouses: warehouseCount?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/dashboard/low-stock", async (_req, res) => {
  try {
    const balances = await db
      .select({
        productId: stockBalancesTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        unit: productsTable.unit,
        minimumStock: productsTable.minimumStock,
        quantity: sql<string>`sum(${stockBalancesTable.quantity})`,
        reservedQuantity: sql<string>`sum(${stockBalancesTable.reservedQuantity})`,
      })
      .from(stockBalancesTable)
      .leftJoin(productsTable, eq(stockBalancesTable.productId, productsTable.id))
      .groupBy(
        stockBalancesTable.productId,
        productsTable.code,
        productsTable.name,
        productsTable.unit,
        productsTable.minimumStock,
      );

    const lowStock = balances.filter(b => {
      const available = parseFloat(b.quantity || "0") - parseFloat(b.reservedQuantity || "0");
      return available < parseFloat(b.minimumStock || "0");
    }).map(b => ({
      ...b,
      availableStock: parseFloat(b.quantity || "0") - parseFloat(b.reservedQuantity || "0"),
      shortage: parseFloat(b.minimumStock || "0") - (parseFloat(b.quantity || "0") - parseFloat(b.reservedQuantity || "0")),
    }));

    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/dashboard/production-delayed", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: productionOrdersTable.id,
        orderNumber: productionOrdersTable.orderNumber,
        productId: productionOrdersTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        quantityPlanned: productionOrdersTable.quantityPlanned,
        quantityProduced: productionOrdersTable.quantityProduced,
        orderType: productionOrdersTable.orderType,
        status: productionOrdersTable.status,
        priority: productionOrdersTable.priority,
        plannedEndDate: productionOrdersTable.plannedEndDate,
      })
      .from(productionOrdersTable)
      .leftJoin(productsTable, eq(productionOrdersTable.productId, productsTable.id))
      .where(
        notInArray(productionOrdersTable.status, ["finalizada", "cancelada"])
      );
    const delayed = rows.filter(r => r.plannedEndDate && new Date(r.plannedEndDate) < now);
    res.json(delayed);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/dashboard/recent-movements", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: stockMovementsTable.id,
        productId: stockMovementsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        warehouseId: stockMovementsTable.warehouseId,
        warehouseName: warehousesTable.name,
        movementType: stockMovementsTable.movementType,
        quantity: stockMovementsTable.quantity,
        movementDate: stockMovementsTable.movementDate,
        referenceType: stockMovementsTable.referenceType,
      })
      .from(stockMovementsTable)
      .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
      .leftJoin(warehousesTable, eq(stockMovementsTable.warehouseId, warehousesTable.id))
      .orderBy(sql`${stockMovementsTable.movementDate} desc`)
      .limit(20);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
