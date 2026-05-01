import { Router } from "express";
import { db } from "@workspace/db";
import {
  stockBalancesTable,
  stockMovementsTable,
  stockReservationsTable,
  productsTable,
  warehousesTable,
} from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

router.get("/stock/balances", async (req, res) => {
  try {
    const { productId, warehouseId } = req.query as Record<string, string>;
    const conditions = [];
    if (productId) conditions.push(eq(stockBalancesTable.productId, productId));
    if (warehouseId) conditions.push(eq(stockBalancesTable.warehouseId, warehouseId));
    const rows = await db
      .select({
        id: stockBalancesTable.id,
        productId: stockBalancesTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        productUnit: productsTable.unit,
        warehouseId: stockBalancesTable.warehouseId,
        warehouseName: warehousesTable.name,
        stockStatus: stockBalancesTable.stockStatus,
        batchNumber: stockBalancesTable.batchNumber,
        quantity: stockBalancesTable.quantity,
        reservedQuantity: stockBalancesTable.reservedQuantity,
        lastMovementAt: stockBalancesTable.lastMovementAt,
      })
      .from(stockBalancesTable)
      .leftJoin(productsTable, eq(stockBalancesTable.productId, productsTable.id))
      .leftJoin(warehousesTable, eq(stockBalancesTable.warehouseId, warehousesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/stock/availability/:productId", async (req, res) => {
  try {
    const balances = await db
      .select()
      .from(stockBalancesTable)
      .where(eq(stockBalancesTable.productId, req.params.productId));
    const available = balances.reduce((sum, b) => sum + parseFloat(b.quantity || "0") - parseFloat(b.reservedQuantity || "0"), 0);
    const total = balances.reduce((sum, b) => sum + parseFloat(b.quantity || "0"), 0);
    const reserved = balances.reduce((sum, b) => sum + parseFloat(b.reservedQuantity || "0"), 0);
    res.json({ productId: req.params.productId, totalStock: total, reservedStock: reserved, availableStock: available });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/stock/movements", async (req, res) => {
  try {
    const { productId, warehouseId } = req.query as Record<string, string>;
    const conditions = [];
    if (productId) conditions.push(eq(stockMovementsTable.productId, productId));
    if (warehouseId) conditions.push(eq(stockMovementsTable.warehouseId, warehouseId));
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
        referenceType: stockMovementsTable.referenceType,
        referenceId: stockMovementsTable.referenceId,
        notes: stockMovementsTable.notes,
        movementDate: stockMovementsTable.movementDate,
        userId: stockMovementsTable.userId,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
      .leftJoin(warehousesTable, eq(stockMovementsTable.warehouseId, warehousesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(stockMovementsTable.movementDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/stock/movements", async (req, res) => {
  try {
    const { productId, warehouseId, movementType, quantity, stockStatus, ...rest } = req.body;
    const [movement] = await db.insert(stockMovementsTable).values({
      productId,
      warehouseId,
      movementType,
      quantity,
      destinationStatus: stockStatus || "disponivel",
      ...rest,
    }).returning();

    const existingBalances = await db
      .select()
      .from(stockBalancesTable)
      .where(and(
        eq(stockBalancesTable.productId, productId),
        eq(stockBalancesTable.warehouseId, warehouseId),
        eq(stockBalancesTable.stockStatus, stockStatus || "disponivel"),
      ));

    if (existingBalances.length > 0) {
      const current = parseFloat(existingBalances[0].quantity || "0");
      const delta = movementType.startsWith("saida") || movementType === "baixa_venda" || movementType === "perda_sucata" ? -parseFloat(quantity) : parseFloat(quantity);
      await db.update(stockBalancesTable)
        .set({ quantity: String(current + delta), lastMovementAt: new Date(), updatedAt: new Date() })
        .where(eq(stockBalancesTable.id, existingBalances[0].id));
    } else {
      await db.insert(stockBalancesTable).values({
        productId,
        warehouseId,
        stockStatus: stockStatus || "disponivel",
        quantity,
        lastMovementAt: new Date(),
      });
    }

    res.status(201).json(movement);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/stock/reservations", async (req, res) => {
  try {
    const { salesOrderId } = req.query as Record<string, string>;
    const rows = await db
      .select()
      .from(stockReservationsTable)
      .where(salesOrderId ? eq(stockReservationsTable.salesOrderId, salesOrderId) : undefined);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
