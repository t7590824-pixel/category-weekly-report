import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeAnalysisModel } from "./_core/analysis";
import { ANALYSIS_PROMPTS } from "./_core/modulePrompts";
import {
  getTargetData,
  getSalesYoY,
  getSalesWoW,
  getDualPlatform,
  getChannelData,
  getNewOldData,
  getSceneData,
  getSceneByCategoryData,
  getBestsellerElements,
  getNewOldRangeTop15,
  getAvailableCountries,
  getAvailablePeriods,
  getKeySkcData,
  clearCache,
} from "./sheetsData";
import { getCompetitorData } from "./competitorScraper";

const countryInput = z.object({
  country: z.string().default("UK"),
  forceRefresh: z.boolean().optional().default(false),
  period: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  report: router({
    // Available countries
    countries: publicProcedure.query(() => getAvailableCountries()),

    // Available periods (weeks + months)
    availablePeriods: publicProcedure.query(() => getAvailablePeriods()),

    // 1.2 Target progress
    targetProgress: publicProcedure
      .input(z.object({ forceRefresh: z.boolean().optional().default(false) }))
      .query(({ input }) => getTargetData(input.forceRefresh)),

    // 1.2 Sales YoY
    salesYoY: publicProcedure
      .input(countryInput)
      .query(({ input }) => getSalesYoY(input.country, input.forceRefresh, input.period)),

    // 1.2 Sales WoW
    salesWoW: publicProcedure
      .input(countryInput)
      .query(({ input }) => getSalesWoW(input.country, input.forceRefresh, input.period)),

    // 1.2 Dual platform
    dualPlatform: publicProcedure
      .input(countryInput)
      .query(({ input }) => getDualPlatform(input.country, input.forceRefresh, input.period)),

    // 1.3 Channel performance
    channelPerformance: publicProcedure
      .input(countryInput)
      .query(({ input }) => getChannelData(input.country, input.forceRefresh, input.period)),

    // 1.4 New vs Old products
    newOldProducts: publicProcedure
      .input(countryInput)
      .query(({ input }) => getNewOldData(input.country, input.forceRefresh, input.period)),

    // 1.5 Scene performance
    scenePerformance: publicProcedure
      .input(countryInput)
      .query(({ input }) => getSceneData(input.country, input.forceRefresh, input.period)),

    // 1.5b Scene × Category breakdown
    sceneByCategoryData: publicProcedure
      .input(countryInput)
      .query(({ input }) => getSceneByCategoryData(input.country, input.forceRefresh, input.period)),

    // 2.4 Competitor analysis
    competitors: publicProcedure
      .input(z.object({ forceRefresh: z.boolean().optional().default(false) }))
      .query(({ input }) => getCompetitorData(input.forceRefresh)),

    // 2.5 Bestseller elements
    bestsellerElements: publicProcedure
      .input(countryInput)
      .query(({ input }) => getBestsellerElements(input.country, input.forceRefresh, input.period)),

    newOldRangeTop15: publicProcedure
      .input(countryInput)
      .query(({ input }) => getNewOldRangeTop15(input.country, input.forceRefresh, input.period)),

    // 上周重点 SKC
    keySkc: publicProcedure
      .input(countryInput)
      .query(({ input }) => getKeySkcData(input.country, input.forceRefresh, input.period)),

    // AI analysis generation
    generateAnalysis: publicProcedure
      .input(z.object({
        moduleKey: z.string(),
        data: z.string(), // JSON string of module data
      }))
      .mutation(async ({ input }) => {
        // elements_cat_* 品类专用 prompt
        const isCatElements = input.moduleKey.startsWith("elements_cat_");
        const catName = isCatElements ? input.moduleKey.replace("elements_cat_", "") : "";
        const catElementsPrompt = `你是一名资深电商品类运营分析师，专注于「${catName}」品类的爆款设计元素分析。
任务：基于本期和同期（去年同期）${catName} Top15 款式的具体属性，提炼设计元素的共性与差异，输出可指导商品开发和选款的洞察。字数控制在100字左右。

数据字段说明：
- curTop15：本期 Top15 SKC 列表，每款包含 thirdCategory（三级品类/款式）、occasion（场合）、firstSecondColor（首复色：首色=该 SKC 版型+颜色首次上架时的颜色；复色=在热销老款版型基础上新增的颜色，非全新版型）、sales、uvOutput、ctr、cvr 等
- cmpTop15：同期 Top15 SKC 列表，字段同上
- newRatio/oldRatio：新老品占比

分析维度（按优先级）：
1. 款式结构：thirdCategory 分布（如连衣裙的裙长、裙型），对比本期 vs 同期高频款式
2. 颜色/印花：firstSecondColor 分布（首色=版型+颜色首次上架；复色=热销版型追加颜色），哪些色系/印花在 Top15 中高频出现，今年 vs 去年有何变化
3. 场合：occasion 分布，哪个场合款式最畅销，今年 vs 去年有何迁移
4. 新老品结构：新品靠哪些元素获得流量，老品靠哪些元素维持转化

输出格式（不使用 Markdown 标题符号 #）：
一、款式结构对比（本期 vs 同期高频 thirdCategory）
二、颜色/印花对比（本期 vs 同期高频 firstSecondColor）
三、场合迁移（occasion 变化）
四、新老品元素差异与下期选款建议（2-3条）

禁止：逐款复述 SKC 编码 / 只报占比不解释含义 / 超过 150 字 / 使用 AI 套话。`;

        // elements 整体分析：从传入数据中读取 isMonthly 字段，周报用 elements_weekly，月报用 elements
        let isMonthlyData = false;
        if (input.moduleKey === "elements") {
          try { isMonthlyData = !!(JSON.parse(input.data) as any)?.weeks?.cmpLabel?.match(/^\d{4}年\d{1,2}月$|^\d{6}$/); } catch {}
          // 如果 cmpLabel 是月份格式则为月报，否则为周报（上周格式如 2026W18）
          const elemKey = isMonthlyData ? "elements" : "elements_weekly";
          const systemPrompt = isCatElements ? catElementsPrompt : (ANALYSIS_PROMPTS[elemKey] ?? ANALYSIS_PROMPTS["elements"] ?? "你是一名资深电商品类运营分析师，请根据以下数据用中文撰写简洁的分析总结（150字以内）。");
          let parsedData: unknown;
          try { parsedData = JSON.parse(input.data); } catch { parsedData = input.data; }
          const analysis = await invokeAnalysisModel({
            moduleKey: input.moduleKey,
            systemPrompt,
            parsedData,
          });
          return { analysis };
        }
        const promptKey = input.moduleKey === "targetProgress" ? "target" : input.moduleKey;
        const systemPrompt = isCatElements ? catElementsPrompt : (ANALYSIS_PROMPTS[promptKey] ??
          "你是一名资深电商品类运营分析师，请根据以下数据用中文撰写简洁的分析总结（150字以内）。");

        let parsedData: unknown;
        try {
          parsedData = JSON.parse(input.data);
        } catch {
          parsedData = input.data;
        }

        const analysis = await invokeAnalysisModel({
          moduleKey: input.moduleKey,
          systemPrompt,
          parsedData,
        });
        return { analysis };
      }),

    // Refresh all data
    refreshAll: publicProcedure
      .input(z.object({ country: z.string().default("UK") }))
      .mutation(async ({ input }) => {
        clearCache();
        await Promise.all([
          getTargetData(true),
          getSalesYoY(input.country, true),
          getSalesWoW(input.country, true),
          getDualPlatform(input.country, true),
          getChannelData(input.country, true),
          getNewOldData(input.country, true),
          getSceneData(input.country, true),
          getSceneByCategoryData(input.country, true),
          getCompetitorData(true),
          getBestsellerElements(input.country, true),
          getNewOldRangeTop15(input.country, true),
          getKeySkcData(input.country, true),
        ]);
        return { success: true, refreshedAt: new Date().toISOString() };
      }),
  }),
});

export type AppRouter = typeof appRouter;

