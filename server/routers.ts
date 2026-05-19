import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeAnalysisModel } from "./_core/analysis";
import { ANALYSIS_PROMPTS } from "./_core/modulePrompts";
import {
  buildAnalysisCacheKey,
  clearAnalysisCache,
  getCachedAnalysis,
  setCachedAnalysis,
} from "./_core/analysisCache";
import {
  getTargetData,
  getSalesYoY,
  getSalesWoW,
  getDualPlatform,
  getChannelData,
  getNewOldData,
  getSceneData,
  getSceneByCategoryData,
  getOccasionData,
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

    occasionPerformance: publicProcedure
      .input(countryInput)
      .query(({ input }) => getOccasionData(input.country, input.forceRefresh, input.period)),

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
        forceRefresh: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input }) => {
        const cacheKey = buildAnalysisCacheKey(input.moduleKey, input.data);
        if (!input.forceRefresh) {
          const cachedAnalysis = getCachedAnalysis(cacheKey);
          if (cachedAnalysis) {
            return { analysis: cachedAnalysis, cached: true };
          }
        }

        // elements_cat_* 品类专用 prompt
        const isCatElements = input.moduleKey.startsWith("elements_cat_");
        const catName = isCatElements ? input.moduleKey.replace("elements_cat_", "") : "";
        const catElementsPrompt = `你是一名资深电商品类运营分析师，专注于「${catName}」品类的爆款设计元素分析。
任务：基于本期和对比期 ${catName} Top15 款式的标签属性，提炼已经被 Top 款验证过的爆款元素，并给出可放大方向。字数控制在150字以内。

数据字段说明：
- curTop15 / cmpTop15：Top15 SKC 列表，包含 thirdCategory、occasion、primaryColorSystem、primaryPattern、designDetails、shape、collarShape、sleeveLength、dressLength、fabricTypes、strapType、skirtType、sales、uvOutput、ctr、cvr 等

分析维度（按优先级）：
1. 款式结构：thirdCategory、shape、dressLength、strapType、skirtType
2. 颜色与图案：primaryColorSystem、primaryPattern
3. 设计细节：designDetails、collarShape、sleeveLength
4. 场景与放大：occasion 在哪些场景高频出现，哪些元素已经被多个 Top 款验证，适合继续放大

输出格式（不使用 Markdown 标题符号 #）：
一、当前高频爆款元素
二、相较对比期增强/减弱的元素
三、可放大方向（2条）

禁止：逐款复述 SKC 编码 / 只报频次不解释含义 / 超过 150 字 / 使用 AI 套话。`;

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
          setCachedAnalysis(cacheKey, analysis);
          return { analysis, cached: false };
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
        setCachedAnalysis(cacheKey, analysis);
        return { analysis, cached: false };
      }),

    // Refresh all data
    refreshAll: publicProcedure
      .input(z.object({ country: z.string().default("UK") }))
      .mutation(async ({ input }) => {
        clearCache();
        clearAnalysisCache();
        await Promise.all([
          getTargetData(true),
          getSalesYoY(input.country, true),
          getSalesWoW(input.country, true),
          getDualPlatform(input.country, true),
          getChannelData(input.country, true),
          getNewOldData(input.country, true),
          getSceneData(input.country, true),
          getSceneByCategoryData(input.country, true),
          getOccasionData(input.country, true),
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

