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
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// ─── Número sequencial robusto (baseado no banco) ────────────────────────────
async function nextNumber(
  tableName: string,
  colName: string,
  prefix: string,
): Promise<string> {
  const result = await db.execute(
    sql`SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(${sql.raw(colName)}, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) AS max_num FROM ${sql.raw(tableName)}`,
  );
  const max = Number((result.rows[0] as any)?.max_num ?? 0);
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

// ─── SOLICITAÇÕES DE COMPRA ───────────────────────────────────────────────────

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
    req.log.error({ err }, "Erro ao listar solicitações");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-requests", async (req, res) => {
  try {
    const { productId, quantity, neededDate, source, notes } = req.body ?? {};
    if (!productId) {
      res.status(400).json({ error: "Produto é obrigatório" });
      return;
    }
    if (!quantity || isNaN(parseFloat(quantity))) {
      res.status(400).json({ error: "Quantidade inválida" });
      return;
    }
    const requestNumber = req.body.requestNumber || await nextNumber("purchase_requests", "request_number", "SC-");
    const [row] = await db.insert(purchaseRequestsTable).values({
      requestNumber,
      productId,
      quantity: String(quantity),
      neededDate: neededDate ? new Date(neededDate) : null,
      source: source || "manual",
      notes: notes || null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar solicitação de compra");
    res.status(500).json({ error: "Erro ao criar solicitação" });
  }
});

router.put("/purchase-requests/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(purchaseRequestsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Solicitação não encontrada" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar solicitação");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-requests/:id/approve", async (req, res) => {
  try {
    const [row] = await db
      .update(purchaseRequestsTable)
      .set({ status: "aprovada", updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Solicitação não encontrada" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Erro ao aprovar solicitação");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-requests/:id/convert", async (req, res) => {
  try {
    const [row] = await db
      .update(purchaseRequestsTable)
      .set({ status: "convertida", updatedAt: new Date() })
      .where(eq(purchaseRequestsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Solicitação não encontrada" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Erro ao converter solicitação");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── PEDIDOS DE COMPRA ────────────────────────────────────────────────────────

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
    req.log.error({ err }, "Erro ao listar pedidos de compra");
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
    req.log.error({ err }, "Erro ao buscar pedido de compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchase-orders", async (req, res) => {
  try {
    const { items, supplierId, expectedDate, notes } = req.body ?? {};
    if (!supplierId) {
      res.status(400).json({ error: "Fornecedor é obrigatório" });
      return;
    }
    const orderNumber = req.body.orderNumber || await nextNumber("purchase_orders", "order_number", "PC-");
    const [order] = await db.insert(purchaseOrdersTable).values({
      orderNumber,
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes: notes || null,
      totalAmount: items?.length
        ? String(items.reduce((s: number, i: any) => s + parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0"), 0))
        : "0",
    }).returning();
    if (items?.length) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((i: any) => ({
          purchaseOrderId: order.id,
          productId: i.productId,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice || "0"),
          totalPrice: String(parseFloat(i.quantity) * parseFloat(i.unitPrice || "0")),
        }))
      );
    }
    res.status(201).json(order);
  } catch (err) {
    req.log.error({ err }, "Erro ao criar pedido de compra");
    res.status(500).json({ error: "Erro ao criar pedido de compra" });
  }
});

router.put("/purchase-orders/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(purchaseOrdersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Pedido de compra não encontrado" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar pedido de compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── RECEBIMENTOS ─────────────────────────────────────────────────────────────

router.get("/receipts", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: receiptsTable.id,
        receiptNumber: receiptsTable.receiptNumber,
        purchaseOrderId: receiptsTable.purchaseOrderId,
        receiptDate: receiptsTable.receiptDate,
        status: receiptsTable.status,
        notes: receiptsTable.notes,
        createdAt: receiptsTable.createdAt,
      })
      .from(receiptsTable)
      .orderBy(receiptsTable.receiptDate);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar recebimentos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/receipts", async (req, res) => {
  try {
    const { items, purchaseOrderId, notes } = req.body ?? {};
    if (!purchaseOrderId) {
      res.status(400).json({ error: "Pedido de compra é obrigatório" });
      return;
    }
    if (!items?.length) {
      res.status(400).json({ error: "Nenhum item para receber" });
      return;
    }

    const receiptNumber = await nextNumber("receipts", "receipt_number", "REC-");
    const [receipt] = await db.insert(receiptsTable).values({
      receiptNumber,
      purchaseOrderId,
      notes: notes || null,
      status: "concluido",
    }).returning();

    for (const item of items) {
      if (!item.productId || !item.warehouseId) continue;

      await db.insert(receiptItemsTable).values({
        receiptId: receipt.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice || "0"),
      });

      // Atualizar saldo de estoque
      const [existing] = await db
        .select()
        .from(stockBalancesTable)
        .where(and(
          eq(stockBalancesTable.productId, item.productId),
          eq(stockBalancesTable.warehouseId, item.warehouseId),
        ));

      if (existing) {
        await db.update(stockBalancesTable).set({
          quantity: String(parseFloat(existing.quantity ?? "0") + parseFloat(item.quantity)),
          lastMovementAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(stockBalancesTable.id, existing.id));
      } else {
        await db.insert(stockBalancesTable).values({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: String(item.quantity),
          lastMovementAt: new Date(),
        });
      }

      // Registrar movimentação
      await db.insert(stockMovementsTable).values({
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "entrada_compra",
        quantity: String(item.quantity),
        destinationStatus: "disponivel",
        referenceType: "receipt",
        referenceId: receipt.id,
      });

      // Atualizar quantidade recebida no item do pedido
      if (item.purchaseOrderItemId) {
        const [poItem] = await db
          .select()
          .from(purchaseOrderItemsTable)
          .where(eq(purchaseOrderItemsTable.id, item.purchaseOrderItemId));
        if (poItem) {
          await db.update(purchaseOrderItemsTable).set({
            receivedQuantity: String(
              parseFloat(poItem.receivedQuantity ?? "0") + parseFloat(item.quantity)
            ),
          }).where(eq(purchaseOrderItemsTable.id, item.purchaseOrderItemId));
        }
      }
    }

    // Atualizar status do pedido de compra
    const poItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseOrderId));

    const allReceived = poItems.every(
      i => parseFloat(i.receivedQuantity ?? "0") >= parseFloat(i.quantity ?? "0")
    );

    await db.update(purchaseOrdersTable)
      .set({ status: allReceived ? "recebido" : "recebido_parcial", updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, purchaseOrderId));

    res.status(201).json(receipt);
  } catch (err) {
    req.log.error({ err }, "Erro ao registrar recebimento");
    res.status(500).json({ error: "Erro ao registrar recebimento" });
  }
});

export default router;
