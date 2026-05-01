import { Router } from "express";
import { db } from "@workspace/db";
import {
  mrpRunsTable,
  mrpResultsTable,
  productsTable,
  salesOrdersTable,
  salesOrderItemsTable,
  stockBalancesTable,
  productionOrdersTable,
  purchaseOrderItemsTable,
  purchaseOrdersTable,
  bomHeadersTable,
  bomItemsTable,
} from "@workspace/db";
import { eq, and, ne, notInArray, inArray } from "drizzle-orm";

const router = Router();

let runCounter = 1000;
const nextRun = () => `MRP-${String(++runCounter).padStart(5, "0")}`;

router.get("/mrp/runs", async (_req, res) => {
  try {
    const rows = await db.select().from(mrpRunsTable).orderBy(mrpRunsTable.runDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/mrp/runs/:id/results", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: mrpResultsTable.id,
        mrpRunId: mrpResultsTable.mrpRunId,
        productId: mrpResultsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        productUnit: productsTable.unit,
        grossRequirement: mrpResultsTable.grossRequirement,
        availableStock: mrpResultsTable.availableStock,
        reservedStock: mrpResultsTable.reservedStock,
        openProductionQuantity: mrpResultsTable.openProductionQuantity,
        openPurchaseQuantity: mrpResultsTable.openPurchaseQuantity,
        netRequirement: mrpResultsTable.netRequirement,
        suggestedAction: mrpResultsTable.suggestedAction,
        suggestedQuantity: mrpResultsTable.suggestedQuantity,
        dueDate: mrpResultsTable.dueDate,
        sourceReference: mrpResultsTable.sourceReference,
        notes: mrpResultsTable.notes,
      })
      .from(mrpResultsTable)
      .leftJoin(productsTable, eq(mrpResultsTable.productId, productsTable.id))
      .where(eq(mrpResultsTable.mrpRunId, req.params.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/mrp/run", async (req, res) => {
  try {
    const runNumber = nextRun();
    const [run] = await db.insert(mrpRunsTable).values({
      runNumber,
      status: "calculado",
      consideredSalesOrders: req.body.consideredSalesOrders ?? true,
      consideredMinimumStock: req.body.consideredMinimumStock ?? true,
      notes: req.body.notes,
    }).returning();

    const allProducts = await db.select().from(productsTable).where(eq(productsTable.active, true));
    
    const openSalesItems = await db
      .select({
        productId: salesOrderItemsTable.productId,
        quantity: salesOrderItemsTable.quantity,
        deliveredQuantity: salesOrderItemsTable.deliveredQuantity,
        expectedDeliveryDate: salesOrdersTable.expectedDeliveryDate,
        orderNumber: salesOrdersTable.orderNumber,
      })
      .from(salesOrderItemsTable)
      .leftJoin(salesOrdersTable, eq(salesOrderItemsTable.salesOrderId, salesOrdersTable.id))
      .where(
        and(
          notInArray(salesOrdersTable.status, ["faturado", "cancelado", "expedido"]),
          notInArray(salesOrderItemsTable.status, ["entregue", "cancelado"])
        )
      );

    const openPOs = await db
      .select({
        productId: purchaseOrderItemsTable.productId,
        quantity: purchaseOrderItemsTable.quantity,
        receivedQuantity: purchaseOrderItemsTable.receivedQuantity,
      })
      .from(purchaseOrderItemsTable)
      .leftJoin(purchaseOrdersTable, eq(purchaseOrderItemsTable.purchaseOrderId, purchaseOrdersTable.id))
      .where(notInArray(purchaseOrdersTable.status, ["recebido_total", "cancelado"]));

    const openPOs_map = new Map<string, number>();
    for (const po of openPOs) {
      const pending = parseFloat(po.quantity || "0") - parseFloat(po.receivedQuantity || "0");
      openPOs_map.set(po.productId, (openPOs_map.get(po.productId) || 0) + Math.max(0, pending));
    }

    const openOPs = await db.select().from(productionOrdersTable).where(
      notInArray(productionOrdersTable.status, ["finalizada", "cancelada"])
    );
    const openOPs_map = new Map<string, number>();
    for (const op of openOPs) {
      const remaining = parseFloat(op.quantityPlanned || "0") - parseFloat(op.quantityProduced || "0");
      openOPs_map.set(op.productId, (openOPs_map.get(op.productId) || 0) + Math.max(0, remaining));
    }

    const stockMap = new Map<string, { available: number; reserved: number }>();
    const allBalances = await db.select().from(stockBalancesTable);
    for (const b of allBalances) {
      const cur = stockMap.get(b.productId) || { available: 0, reserved: 0 };
      cur.available += parseFloat(b.quantity || "0");
      cur.reserved += parseFloat(b.reservedQuantity || "0");
      stockMap.set(b.productId, cur);
    }

    const demandMap = new Map<string, { qty: number; dueDate: Date | null; ref: string }>();
    for (const item of openSalesItems) {
      const pending = parseFloat(item.quantity || "0") - parseFloat(item.deliveredQuantity || "0");
      if (pending <= 0) continue;
      const cur = demandMap.get(item.productId) || { qty: 0, dueDate: null, ref: "" };
      cur.qty += pending;
      if (item.expectedDeliveryDate && (!cur.dueDate || new Date(item.expectedDeliveryDate) < cur.dueDate)) {
        cur.dueDate = new Date(item.expectedDeliveryDate);
      }
      cur.ref = item.orderNumber || "";
      demandMap.set(item.productId, cur);
    }

    const results: any[] = [];
    for (const product of allProducts) {
      const demand = demandMap.get(product.id);
      const grossReq = demand?.qty || 0;
      const minStock = parseFloat(product.minimumStock || "0");
      const totalDemand = grossReq + minStock;
      const stock = stockMap.get(product.id) || { available: 0, reserved: 0 };
      const availableStock = stock.available;
      const reservedStock = stock.reserved;
      const openProd = openOPs_map.get(product.id) || 0;
      const openPurch = openPOs_map.get(product.id) || 0;

      const netReq = Math.max(0, totalDemand - availableStock + reservedStock - openProd - openPurch);

      let suggestedAction: string = "sem_acao";
      if (netReq > 0) {
        if (product.isManufactured && product.requiresMachining && product.requiresAssembly) {
          suggestedAction = "fabricar";
        } else if (product.isManufactured && product.requiresAssembly) {
          suggestedAction = "montar";
        } else if (product.isManufactured && product.requiresMachining) {
          suggestedAction = "usinar";
        } else if (product.isPurchased && product.isManufactured) {
          suggestedAction = "fundir_comprar";
        } else if (product.isPurchased) {
          suggestedAction = "comprar";
        } else if (availableStock > 0) {
          suggestedAction = "usar_estoque";
        }
      }

      if (netReq === 0 && availableStock > 0) suggestedAction = "usar_estoque";

      results.push({
        mrpRunId: run.id,
        productId: product.id,
        grossRequirement: String(grossReq),
        availableStock: String(availableStock),
        reservedStock: String(reservedStock),
        openProductionQuantity: String(openProd),
        openPurchaseQuantity: String(openPurch),
        netRequirement: String(netReq),
        suggestedAction,
        suggestedQuantity: String(netReq),
        dueDate: demand?.dueDate || null,
        sourceReference: demand?.ref || null,
      });
    }

    if (results.length > 0) {
      await db.insert(mrpResultsTable).values(results);
    }

    const finalResults = await db
      .select({
        id: mrpResultsTable.id,
        productId: mrpResultsTable.productId,
        productCode: productsTable.code,
        productName: productsTable.name,
        productUnit: productsTable.unit,
        grossRequirement: mrpResultsTable.grossRequirement,
        availableStock: mrpResultsTable.availableStock,
        reservedStock: mrpResultsTable.reservedStock,
        openProductionQuantity: mrpResultsTable.openProductionQuantity,
        openPurchaseQuantity: mrpResultsTable.openPurchaseQuantity,
        netRequirement: mrpResultsTable.netRequirement,
        suggestedAction: mrpResultsTable.suggestedAction,
        suggestedQuantity: mrpResultsTable.suggestedQuantity,
        dueDate: mrpResultsTable.dueDate,
        sourceReference: mrpResultsTable.sourceReference,
      })
      .from(mrpResultsTable)
      .leftJoin(productsTable, eq(mrpResultsTable.productId, productsTable.id))
      .where(eq(mrpResultsTable.mrpRunId, run.id));

    res.status(201).json({ run, results: finalResults });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno no MRP" });
  }
});

router.put("/mrp/runs/:id/approve", async (req, res) => {
  try {
    const [row] = await db.update(mrpRunsTable).set({ status: "aprovado" }).where(eq(mrpRunsTable.id, req.params.id)).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
