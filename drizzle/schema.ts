import { double, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

// 月度 SKC 数据表（因 Google Sheets 单元格超限，改为数据库存储）
// 列结构与周度 SKC 基础数据表完全对齐
export const skcMonthlyData = mysqlTable(
  "skc_monthly_data",
  {
    id: int("id").autoincrement().primaryKey(),
    country: varchar("country", { length: 10 }).notNull(),
    businessYearAndWeek: varchar("business_year_and_week", { length: 20 }).notNull(), // 如 "2026年4月"
    skc: varchar("skc", { length: 64 }).notNull(),
    secondCategory: varchar("second_category", { length: 64 }),
    thirdCategory: varchar("third_category", { length: 64 }),
    firstListDate: varchar("first_list_date", { length: 32 }),
    occasion: varchar("occasion", { length: 64 }),
    firstSecondColor: varchar("first_second_color", { length: 32 }),
    sales: double("sales"),
    qty: double("qty"),
    collectionExposure: double("collection_exposure"),
    collectionClick: double("collection_click"),
    pdpExposure: double("pdp_exposure"),
    addCart: double("add_cart"),
    checkout: double("checkout"),
    onShelfDays: int("on_shelf_days"),
    onShelfRange: varchar("on_shelf_range", { length: 32 }),
    newOldFlag: varchar("new_old_flag", { length: 16 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_period_country").on(table.businessYearAndWeek, table.country)]
);

export type SkcMonthlyData = typeof skcMonthlyData.$inferSelect;
export type InsertSkcMonthlyData = typeof skcMonthlyData.$inferInsert;
