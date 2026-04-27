from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import argparse
import json
import mimetypes
import sqlite3
import time


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fundidos.db"


def now_ts():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def setup_database():
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                document TEXT,
                contact TEXT,
                phone TEXT,
                email TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                metal TEXT NOT NULL,
                unit_weight REAL DEFAULT 0,
                unit TEXT DEFAULT 'pc',
                technical_notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL UNIQUE,
                supplier_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                metal TEXT NOT NULL,
                total_qty REAL NOT NULL,
                request_date TEXT NOT NULL,
                sent_date TEXT,
                supplier_forecast_date TEXT,
                supplier_confirmation TEXT,
                requester TEXT,
                status_manual TEXT DEFAULT 'open',
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                planned_date TEXT,
                actual_date TEXT,
                planned_qty REAL DEFAULT 0,
                received_qty REAL DEFAULT 0,
                invoice TEXT,
                receiver TEXT,
                notes TEXT,
                is_final INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER,
                event_date TEXT NOT NULL,
                event_type TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT,
                email TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )

        defaults = {
            "company_name": "Controle de Fundidos",
            "default_requester": "Compras",
            "default_receiver": "Recebimento",
            "default_unit": "pc",
            "alert_window_days": "3",
        }
        for key, value in defaults.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, value),
            )

        existing_users = conn.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if existing_users == 0:
            ts = now_ts()
            conn.executemany(
                """
                INSERT INTO users (name, role, email, active, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)
                """,
                [
                    ("Compras", "Solicitante", "", ts, ts),
                    ("Recebimento", "Recebimento", "", ts, ts),
                ],
            )


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


def get_settings(conn):
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {row["key"]: row["value"] for row in rows}


def parse_number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def request_metrics(request, deliveries, today=None):
    today = today or time.strftime("%Y-%m-%d")
    total_qty = parse_number(request.get("total_qty"))
    received = sum(parse_number(item.get("received_qty")) for item in deliveries)
    pending = max(total_qty - received, 0)
    percent = 0 if total_qty <= 0 else min(100, (received / total_qty) * 100)

    pending_deliveries = [
        item for item in deliveries
        if not item.get("actual_date") or parse_number(item.get("received_qty")) == 0
    ]
    pending_deliveries.sort(key=lambda item: item.get("planned_date") or "9999-12-31")
    future = [item for item in pending_deliveries if (item.get("planned_date") or "") >= today]
    next_delivery = (future or pending_deliveries or [None])[0]

    forecast = request.get("supplier_forecast_date") or ""
    delayed_by_forecast = bool(forecast and forecast < today and pending > 0)
    delayed_delivery = next(
        (
            item for item in pending_deliveries
            if item.get("planned_date") and item["planned_date"] < today and pending > 0
        ),
        None,
    )
    is_delayed = delayed_by_forecast or bool(delayed_delivery)

    status_manual = request.get("status_manual") or "open"
    if status_manual == "canceled":
        status = "canceled"
    elif received >= total_qty and total_qty > 0:
        status = "complete"
    elif is_delayed:
        status = "delayed"
    elif received > 0:
        status = "partial"
    elif status_manual == "confirmed":
        status = "confirmed"
    else:
        status = "open"

    next_date = None
    if next_delivery:
        next_date = next_delivery.get("planned_date")
    if not next_date:
        next_date = forecast

    return {
        "received": received,
        "pending": pending,
        "percent": percent,
        "status": status,
        "is_delayed": is_delayed,
        "next_date": next_date,
        "over_received": received > total_qty,
    }


def load_requests(conn):
    rows = conn.execute(
        """
        SELECT
            r.*,
            s.name AS supplier_name,
            p.code AS product_code,
            p.name AS product_name,
            p.unit AS product_unit,
            p.unit_weight AS product_unit_weight
        FROM requests r
        JOIN suppliers s ON s.id = r.supplier_id
        JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC, r.id DESC
        """
    ).fetchall()
    requests = []
    for row in rows:
        item = dict(row)
        deliveries = rows_to_dicts(
            conn.execute(
                "SELECT * FROM deliveries WHERE request_id = ? ORDER BY COALESCE(planned_date, '9999-12-31'), id",
                (item["id"],),
            ).fetchall()
        )
        item["deliveries"] = deliveries
        item["metrics"] = request_metrics(item, deliveries)
        requests.append(item)
    return requests


def api_state():
    with connect() as conn:
        return {
            "settings": get_settings(conn),
            "suppliers": rows_to_dicts(conn.execute("SELECT * FROM suppliers ORDER BY name").fetchall()),
            "products": rows_to_dicts(conn.execute("SELECT * FROM products ORDER BY code").fetchall()),
            "requests": load_requests(conn),
            "users": rows_to_dicts(conn.execute("SELECT * FROM users WHERE active = 1 ORDER BY name").fetchall()),
        }


def insert_history(conn, request_id, event_type, description):
    conn.execute(
        """
        INSERT INTO history (request_id, event_date, event_type, description, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (request_id, time.strftime("%Y-%m-%d"), event_type, description, now_ts()),
    )


def api_create_supplier(data):
    ts = now_ts()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO suppliers (name, document, contact, phone, email, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("name", "").strip(),
                data.get("document", "").strip(),
                data.get("contact", "").strip(),
                data.get("phone", "").strip(),
                data.get("email", "").strip(),
                data.get("notes", "").strip(),
                ts,
                ts,
            ),
        )
        return {"id": cur.lastrowid}


def api_create_product(data):
    ts = now_ts()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO products (code, name, description, metal, unit_weight, unit, technical_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("code", "").strip(),
                data.get("name", "").strip(),
                data.get("description", "").strip(),
                data.get("metal", "Ferro fundido"),
                parse_number(data.get("unit_weight")),
                data.get("unit", "pc").strip() or "pc",
                data.get("technical_notes", "").strip(),
                ts,
                ts,
            ),
        )
        return {"id": cur.lastrowid}


def api_create_request(data):
    ts = now_ts()
    product_id = int(data.get("product_id"))
    with connect() as conn:
        product = row_to_dict(conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone())
        if not product:
            raise ValueError("Produto nao encontrado")
        total_qty = parse_number(data.get("total_qty"))
        cur = conn.execute(
            """
            INSERT INTO requests (
                number, supplier_id, product_id, metal, total_qty, request_date, sent_date,
                supplier_forecast_date, supplier_confirmation, requester, status_manual,
                notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("number", "").strip(),
                int(data.get("supplier_id")),
                product_id,
                product["metal"],
                total_qty,
                data.get("request_date"),
                data.get("sent_date") or "",
                data.get("supplier_forecast_date") or "",
                data.get("supplier_confirmation", "").strip(),
                data.get("requester", "").strip(),
                data.get("status_manual", "open"),
                data.get("notes", "").strip(),
                ts,
                ts,
            ),
        )
        request_id = cur.lastrowid
        if data.get("supplier_forecast_date"):
            conn.execute(
                """
                INSERT INTO deliveries (
                    request_id, planned_date, actual_date, planned_qty, received_qty,
                    invoice, receiver, notes, is_final, created_at, updated_at
                )
                VALUES (?, ?, '', ?, 0, '', '', 'Previsao inicial do fornecedor.', 1, ?, ?)
                """,
                (request_id, data.get("supplier_forecast_date"), total_qty, ts, ts),
            )
        insert_history(conn, request_id, "Solicitacao criada", f"Solicitada quantidade {total_qty:g}.")
        return {"id": request_id}


def api_create_delivery(data):
    ts = now_ts()
    request_id = int(data.get("request_id"))
    received_qty = parse_number(data.get("received_qty"))
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO deliveries (
                request_id, planned_date, actual_date, planned_qty, received_qty,
                invoice, receiver, notes, is_final, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request_id,
                data.get("planned_date") or "",
                data.get("actual_date") or "",
                parse_number(data.get("planned_qty")),
                received_qty,
                data.get("invoice", "").strip(),
                data.get("receiver", "").strip(),
                data.get("notes", "").strip(),
                1 if data.get("is_final") else 0,
                ts,
                ts,
            ),
        )
        insert_history(conn, request_id, "Recebimento registrado", f"Recebidas {received_qty:g}.")
        return {"id": cur.lastrowid}


def api_update_forecast(data):
    ts = now_ts()
    request_id = int(data.get("request_id"))
    planned_date = data.get("planned_date") or ""
    planned_qty = parse_number(data.get("planned_qty"))
    with connect() as conn:
        conn.execute(
            """
            UPDATE requests
            SET supplier_forecast_date = ?, supplier_confirmation = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                planned_date,
                data.get("supplier_confirmation", "").strip(),
                ts,
                request_id,
            ),
        )
        conn.execute(
            """
            INSERT INTO deliveries (
                request_id, planned_date, actual_date, planned_qty, received_qty,
                invoice, receiver, notes, is_final, created_at, updated_at
            )
            VALUES (?, ?, '', ?, 0, '', '', ?, 1, ?, ?)
            """,
            (request_id, planned_date, planned_qty, data.get("notes", "").strip(), ts, ts),
        )
        insert_history(conn, request_id, "Previsao atualizada", f"Nova previsao para {planned_date}.")
        return {"ok": True}


def api_update_settings(data):
    with connect() as conn:
        for key, value in data.items():
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value)),
            )
        return {"ok": True}


def excel_escape(value):
    return str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def export_excel():
    data = api_state()
    rows = data["requests"]
    settings = data["settings"]
    line_rows = []
    for item in rows:
        metrics = item["metrics"]
        line_rows.append(
            f"""
            <Row>
              <Cell><Data ss:Type="String">{excel_escape(item['number'])}</Data></Cell>
              <Cell><Data ss:Type="String">{excel_escape(item['supplier_name'])}</Data></Cell>
              <Cell><Data ss:Type="String">{excel_escape(item['product_name'])}</Data></Cell>
              <Cell><Data ss:Type="String">{excel_escape(item['metal'])}</Data></Cell>
              <Cell><Data ss:Type="Number">{item['total_qty'] or 0}</Data></Cell>
              <Cell><Data ss:Type="Number">{metrics['received']}</Data></Cell>
              <Cell><Data ss:Type="Number">{metrics['pending']}</Data></Cell>
              <Cell><Data ss:Type="String">{excel_escape(metrics['next_date'])}</Data></Cell>
              <Cell><Data ss:Type="String">{excel_escape(metrics['status'])}</Data></Cell>
            </Row>
            """
        )
    total_formula = f"SUM(R[-{len(rows)}]C:R[-1]C)" if rows else "0"
    return f"""<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="16"/><Interior ss:Color="#DDEDEA" ss:Pattern="Solid"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F766E" ss:Pattern="Solid"/></Style>
  <Style ss:ID="total"><Font ss:Bold="1"/><Interior ss:Color="#EEF3F4" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Solicitacoes">
  <Table>
   <Row><Cell ss:MergeAcross="8" ss:StyleID="title"><Data ss:Type="String">{excel_escape(settings.get('company_name', 'Controle de Fundidos'))}</Data></Cell></Row>
   <Row/>
   <Row>
    {''.join(f'<Cell ss:StyleID="header"><Data ss:Type="String">{h}</Data></Cell>' for h in ['Solicitacao','Fornecedor','Produto','Metal','Solicitada','Recebida','Pendente','Previsao','Status'])}
   </Row>
   {''.join(line_rows)}
   <Row>
    <Cell ss:StyleID="total"><Data ss:Type="String">Totais</Data></Cell>
    <Cell ss:StyleID="total"/><Cell ss:StyleID="total"/><Cell ss:StyleID="total"/>
    <Cell ss:StyleID="total" ss:Formula="={total_formula}"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="total" ss:Formula="={total_formula}"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="total" ss:Formula="={total_formula}"><Data ss:Type="Number">0</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>"""


class AppHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/state":
                self.send_json(api_state())
                return
            if path == "/api/export/excel":
                body = export_excel().encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.ms-excel; charset=utf-8")
                self.send_header("Content-Disposition", "attachment; filename=solicitacoes-fundidos.xls")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path == "/":
                self.path = "/index.html"
            return super().do_GET()
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self.read_json()
            routes = {
                "/api/suppliers": api_create_supplier,
                "/api/products": api_create_product,
                "/api/requests": api_create_request,
                "/api/deliveries": api_create_delivery,
                "/api/forecast": api_update_forecast,
                "/api/settings": api_update_settings,
            }
            if path not in routes:
                self.send_json({"error": "Rota nao encontrada"}, 404)
                return
            self.send_json(routes[path](data), 201)
        except sqlite3.IntegrityError as exc:
            self.send_json({"error": f"Registro duplicado ou invalido: {exc}"}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)

    def guess_type(self, path):
        if path.endswith(".js"):
            return "application/javascript"
        if path.endswith(".css"):
            return "text/css"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    setup_database()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), AppHandler)
    print(f"Aplicacao aberta em http://127.0.0.1:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
