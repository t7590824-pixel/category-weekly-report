/**
 * 月度 SKC 数据导入接口
 * POST /api/monthly-skc/import  - 上传 Excel(.xlsx) 或 CSV，按月份覆盖写入数据库
 * GET  /api/monthly-skc/periods - 查询已导入的月份列表
 * DELETE /api/monthly-skc/:period - 删除某月数据
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import mysql from "mysql2/promise";
import { sdk } from "./_core/sdk";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import chardet from "chardet";
import { TextDecoder } from "util";

const router = Router();

// multer：内存存储，最大 50MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── 解析文件（xlsx 或 csv）→ Array<Record<string, string>> ──────────────────
async function parseFile(buffer: Buffer, mimetype: string, originalname: string): Promise<Array<Record<string, string>>> {
  const isXlsx = originalname.endsWith(".xlsx") || originalname.endsWith(".xls") || mimetype.includes("spreadsheet") || mimetype.includes("excel");
  
  if (isXlsx) {
    // 用 exceljs 解析 Excel，正确支持中文字符
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(buffer);
    await workbook.xlsx.read(stream);
    const sheet = workbook.worksheets[0];
    const headers: string[] = [];
    const rows: Array<Record<string, string>> = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          headers.push(String(cell.value ?? "").trim());
        });
      } else {
        const r: Record<string, string> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          const key = headers[colNum - 1];
          if (key) r[key] = String(cell.value ?? "").trim();
        });
        rows.push(r);
      }
    });
    return rows;
  } else {
    // CSV：自动检测编码（支持 UTF-8、GBK/GB2312 等）
    const detected = chardet.detect(buffer) ?? "utf-8";
    // chardet 返回 'GB2312'/'GBK'/'GB18030' 等，统一映射到 'gbk'
    const encoding = /gb/i.test(detected) ? "gbk" : "utf-8";
    const decoder = new TextDecoder(encoding);
    const text = decoder.decode(buffer).replace(/^\uFEFF/, ""); // 去除 BOM
    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return rows.map((row) => {
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        r[k.trim()] = String(v ?? "").trim();
      }
      return r;
    });
  }
}

function toNum(v: string): number | null {
  if (!v || v === "-") return null;
  const s = v.replace(/,/g, "").replace(/£/g, "").replace(/\$/g, "").replace(/%/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function toInt(v: string): number | null {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
}

// ─── DB 连接 ─────────────────────────────────────────────────────────────────
async function getConn() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return mysql.createConnection(url);
}

// ─── 鉴权中间件（需要登录） ──────────────────────────────────────────────────
async function requireAuth(req: Request, res: Response, next: () => void) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ─── POST /api/monthly-skc/import ────────────────────────────────────────────
router.post("/import", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { originalname, mimetype, buffer } = req.file;
    const ext = originalname.toLowerCase().split(".").pop() ?? "";
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      res.status(400).json({ error: "请上传 .xlsx 或 .csv 格式的文件" });
      return;
    }

    const rows = await parseFile(buffer, mimetype, originalname);

    if (rows.length === 0) {
      res.status(400).json({ error: "文件为空或格式错误，请检查是否包含数据行" });
      return;
    }

    // 检测 period（business_year_and_week 列）
    const periods = Array.from(new Set(rows.map((r) => r["business_year_and_week"] ?? "").filter(Boolean)));
    if (periods.length === 0) {
      res.status(400).json({ error: "文件缺少 business_year_and_week 列，请使用模板" });
      return;
    }

    const conn = await getConn();
    try {
      // 按月份覆盖：先删除该月份的旧数据
      for (const period of periods) {
        await conn.execute("DELETE FROM `skc_monthly_data` WHERE `business_year_and_week` = ?", [period]);
      }

      // 批量插入，每批 500 行
      const BATCH = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const values = batch.map((r) => [
          r["country"] ?? "",
          r["business_year_and_week"] ?? "",
          r["skc"] ?? "",
          r["second_category"] || null,
          r["third_category"] || null,
          (() => {
            const v = r["首次上架日期"] || "";
            if (!v) return null;
            // Excel 序列号（如 45439）转日期字符串
            const n = parseFloat(v);
            if (!isNaN(n) && n > 1000) {
              const d = new Date(Math.round((n - 25569) * 86400 * 1000));
              return d.toISOString().slice(0, 10);
            }
            return v;
          })(),
          r["场合"] || null,
          r["首复色"] || null,
          toNum(r["销售额"]),
          toInt(r["销量"]),
          toInt(r["Collection页面商品曝光用户数"] ?? r["Collection曝光用户数"] ?? ""),
          toInt(r["Collection页面商品点击用户数"] ?? r["Collection点击用户数"] ?? ""),
          toInt(r["PDP页面曝光用户数"] ?? r["PDP曝光用户数"] ?? ""),
          toInt(r["PDP页面加车按钮点击用户数"] ?? r["PDP页面加车按鈕点击用户数"] ?? r["加车按钮点击用户数"] ?? ""),
          toInt(r["Checkout按钮点击用户数"] ?? r["Checkout按鈕点击用户数"] ?? r["Checkout点击用户数"] ?? ""),
          null, // on_shelf_days 暂不支持月度
          null, // on_shelf_range 暂不支持月度
          r["月度新老品"] || r["周度新老品"] || null,
        ]);

        const placeholders = values.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
        const flat = values.flat();
        await conn.execute(
          `INSERT INTO \`skc_monthly_data\`
           (country, business_year_and_week, skc, second_category, third_category,
            first_list_date, occasion, first_second_color,
            sales, qty, collection_exposure, collection_click, pdp_exposure,
            add_cart, checkout, on_shelf_days, on_shelf_range, new_old_flag)
           VALUES ${placeholders}`,
          flat
        );
        inserted += batch.length;
      }

      await conn.end();
      res.json({ success: true, periods, inserted, total: rows.length });
    } catch (err) {
      await conn.end();
      throw err;
    }
  } catch (err: unknown) {
    console.error("[monthly-skc import]", err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── GET /api/monthly-skc/periods ────────────────────────────────────────────
router.get("/periods", async (_req: Request, res: Response) => {
  try {
    const conn = await getConn();
    const [rows] = await conn.execute(
      "SELECT business_year_and_week as period, COUNT(*) as rowCount FROM `skc_monthly_data` GROUP BY business_year_and_week ORDER BY business_year_and_week DESC"
    );
    await conn.end();
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── DELETE /api/monthly-skc/:period ─────────────────────────────────────────
router.delete("/:period", requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.params;
    const conn = await getConn();
    const [result] = await conn.execute(
      "DELETE FROM `skc_monthly_data` WHERE `business_year_and_week` = ?",
      [decodeURIComponent(period)]
    ) as [mysql.ResultSetHeader, unknown];
    await conn.end();
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export function registerMonthlyImportRoutes(app: import("express").Application) {
  app.use("/api/monthly-skc", router);
}
