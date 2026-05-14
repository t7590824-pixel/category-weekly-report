import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeAnalysisModel } from "./_core/analysis";
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

// Module-specific analysis prompts
const ANALYSIS_PROMPTS: Record<string, string> = {
  target: `你是一名资深电商品类运营分析师。请根据以下各国家/站点月度达成进度数据，用中文撰写简洁的分析总结（150字以内）。格式：先总结整体达成情况，再点出表现最好和最差的站点，并给出可能原因。`,
  salesYoY: `你是一名资深电商品类运营分析师。以下是销售同比数据。

核心品类（必须且只分析这些）：连衣裙、连体装、罩衫、上衣、下装。
非核心品类（如泳衣、首饰、内衣、拖鞋、家居服等）一律不得提及。

【数据字段说明（必读）】
- salesChg = 销售额同比，直接引用，如 +5.20%
- exposureChg = 曝光同比，直接引用
- uvChg = UV同比，直接引用
- uvOutputChg = UV产出同比，直接引用
- ctrChg = CTR同比，直接引用
- cvrChg = CVR同比，直接引用
- salesShare = 本期销售占比，直接引用，如 15.39%
- salesShareCmp = 对比期占比，直接引用，如 14.38%
- salesShareChg = 占比百分点差（pp），已预计算，直接引用，如 +1.01pp

【严禁】不得自行计算占比变化率。占比变化必须直接引用 salesShareChg 字段（百分点差 pp）。

请严格按照以下固定模版输出，不要使用Markdown标题符号#，直接用文字标签：

【同比】
多品类销售同比{salesChg}，曝光{exposureChg}，UV {uvChg}，UV产出{uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}；
连衣裙销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
罩衫销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
连体装销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
下装销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
上衣销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；

【总结】结合以上核心品类数据，提炼2-3句关键趋势和运营建议。`,
  salesWoW: `你是一名资深电商品类运营分析师。以下是销售环比数据。

核心品类（必须且只分析这些）：连衣裙、连体装、罩衫、上衣、下装、牛仔。
非核心品类（如泳衣、首饰、内衣、拖鞋、家居服等）一律不得提及。

【数据字段说明（必读）】
- salesChg = 销售额环比，直接引用，如 +5.20%
- exposureChg = 曝光环比，直接引用
- uvChg = UV环比，直接引用
- uvOutputChg = UV产出环比，直接引用
- ctrChg = CTR环比，直接引用
- cvrChg = CVR环比，直接引用
- salesShare = 本期销售占比，直接引用，如 15.39%
- salesShareCmp = 对比期占比，直接引用，如 14.38%
- salesShareChg = 占比百分点差（pp），已预计算，直接引用，如 +1.01pp

【严禁】不得自行计算占比变化率。占比变化必须直接引用 salesShareChg 字段（百分点差 pp）。

请严格按照以下固定模版输出，不要使用Markdown标题符号#，直接用文字标签：

【环比】
多品类销售环比{salesChg}，曝光{exposureChg}，UV {uvChg}，UV产出{uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}；
连衣裙销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
罩衫销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
连体装销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
下装销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
上衣销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；
牛仔销售 {salesChg}，曝光 {exposureChg}，UV {uvChg}，UV产出 {uvOutputChg}，CTR {ctrChg}，CVR {cvrChg}，占比 {salesShare}（对比期 {salesShareCmp}，变化 {salesShareChg}）；

【总结】结合以上核心品类数据，提炼2-3句关键趋势和运营建议。`,
  dualPlatform: `你是一名资深电商品类运营分析师。以下是APP/WEB双端数据，包含环比（wow）和同比（yoy）两组，以及品类同环比参考数据。

数据字段说明（必须严格按此解读）：
- cur = 本期数据，cmp = 对比期数据
- share = 本期销售占比，shareCmp = 对比期销售占比
- uvShare = 本期 UV 占比，uvShareCmp = 对比期 UV 占比
- 占比判断：share < shareCmp 就是下降，share > shareCmp 就是上升，不得搞反
- 正增长带+号（如+22.75%），负增长带-号

请严格按照以下固定模版输出，不要使用Markdown标题符号#，直接用文字标签：

【双端环比】
整体多品类销售环比X%；APP销售环比X%，销售占比X%（对比期X%，变化X%），UV环比X%，UV占比X%（对比期X%，变化X%），CTR X%，CVR X%，UV产出X%；WEB销售环比X%，销售占比X%（对比期X%，变化X%），UV环比X%，UV占比X%（对比期X%，变化X%），CTR X%，CVR X%，UV产出X%。

【双端同比】
APP销售同比X%，销售占比X%（对比期X%，变化X%），CTR X%，CVR X%；WEB销售同比X%，销售占比X%（对比期X%，变化X%），CTR X%，CVR X%。

【深度分析】
结合品类同环比数据，分析APP占比变化的归因：是哪些品类在APP/WEB表现分化导致占比变化？流量效率（CTR/CVR/UV产出）的差异在哪个端口更明显？给出具体可执行的运营建议（如哪个端口需要加大投放、哪个端口流量效率需要优化）。`,
  channel: `你是一名资深电商品类运营分析师。以下是渠道表现数据（含环比和同比）。

分析规则：
1. 只分析当期销售占比 ≥2% 的主渠道，占比不足2%的渠道一律忽略不提。
2. Affiliate 渠道无论占比多少，一律不得提及。
3. 聚焦增长归因和下滑归因，说明是哪些渠道带动了整体增长、哪些渠道拖累了整体，以及背后的流量效率（CTR/CVR/UV产出）变化原因。

请严格按照以下固定模版输出，不要使用Markdown标题符号#，直接用文字标签：

【增长来源】列出环比/同比增长明显的主渠道（占比≥2%），说明销售变化幅度及增长驱动因素（是流量增加还是转化率提升）。

【下滑拖累】列出环比/同比下滑明显的主渠道（占比≥2%），说明销售变化幅度及下滑原因（曝光减少、CTR/CVR下降等哪个环节出了问题）。

【总结】1-2句提炼渠道整体趋势和运营重点建议。`,
  newOld: `你是一名资深电商品类运营分析师。请根据以下新老品表现数据（含在架天数区间分析），用中文撰写分析（150字以内）：对比新老品的销售贡献和流量效率，分析不同在架天数区间的表现差异，给出新品引入节奏建议。`,
  scene: `你是一名资深电商品类运营分析师。请根据以下场景表现数据（含同比和环比），用中文撰写分析（150字以内）：总结各场景销售占比变化，指出增长最快的场景及其流量效率，给出场景运营重点建议。`,
  // 月报专用：本期 vs 同期（去年同月）对比
  elements: `你要输出一份「新老品 Top15 爆款元素分析（月报）」。任务是基于本期新老品 Top15 与去年同期新老品 Top15，提炼两期 Top 款在二级品类结构、款式结构、颜色、印花、设计细节和经营表现上的共性与差异，输出可用于商品开发、复色/复印花、页面卖点和投放素材的洞察建议。

核心原则：
1. 禁止把"新品/老品占比"作为分析结论，因为数据结构固定为 Top15 新品 + Top15 老品，新老品天然各占 50%，不具备洞察价值。
2. 必须分析二级品类占比与结构变化，如 Dress、Bikini Set、One Piece、Cover Up、Top、Bottom 等在本期 vs 同期 Top 款中的分布变化，并解释经营含义。
3. 二级品类占比只能作为款式结构入口，不能停留在报数，必须进一步落到：款式结构 × 颜色 × 印花 × 设计细节 × 经营表现。
4. 颜色和印花必须分开分析：颜色总结高频色系、基础色/亮色/清爽色/组合色变化；印花总结花卉、热带、条纹、几何、抽象、波点、纯色等图案趋势。禁止只写"颜色丰富""印花多样"。
5. Beachwear、夏季旺季、价格带只能作为辅助解释，不能作为核心洞察。
6. 禁止根据缺失数据强行推断；如数据不足，只能写"从 Top 款表现看"或"当前样本中体现"。
7. 输出控制在 500–700 字。
8. 取消"下期动作"模块，不输出具体执行动作清单。

数据说明：传入数据包含 curNewTop15/curOldTop15（本期新老品 Top15）、cmpNewTop15/cmpOldTop15（同期新老品 Top15），每款 SKC 包含：secondCategory（二级品类）、thirdCategory（三级品类/场合）、firstSecondColor（首复色：首色=该 SKC 版型+颜色首次上架时的颜色；复色=在热销老款版型基础上新增的颜色，非全新版型）、sales、uv、ctr、cvr、uvOutput 等字段。

输出格式（严格按以下格式，不使用 # 标题符号）：
一、二级品类结构对比（本期 vs 同期）
二、两期畅销元素共性（款式结构、颜色、印花、设计细节各一段）
三、本期新增/减弱元素（相较同期变化，结合经营表现解释）
四、机会点（3条：复色/复印花机会、页面卖点或投放素材机会）

禁止：禁止输出"新老品占比对比"；禁止把 Beachwear/夏季旺季/价格带作为核心结论；禁止逐款复述 SKC；禁止输出"下期动作"；禁止超过 700 字。`,
  // 周报专用：本期 vs 上周环比对比
  elements_weekly: `你要输出一份「新老品 Top15 爆款元素分析（周报）」。任务是基于本周（curNewTop15/curOldTop15）与上周（cmpNewTop15/cmpOldTop15）新老品 Top15，分析本周 Top 款的爆款元素特征，以及相较上周的变化趋势，输出可用于下周选款、补货和投放素材的洞察建议。

核心原则：
1. 这是周度环比分析，禁止出现"同比""去年同期""两年对比"等字眼，只分析本周 vs 上周的变化。
2. 禁止把"新品/老品占比"作为分析结论，因为数据结构固定为 Top15 新品 + Top15 老品，新老品天然各占 50%，不具备洞察价值。
3. 必须分析二级品类占比变化，如 Dress、One Piece、Cover Up、Top、Bottom 等在本周 vs 上周 Top 款中的分布变化，并解释经营含义。
4. 颜色和印花必须分开分析：颜色总结高频色系变化；印花总结花卉、热带、条纹、几何、抽象、波点、纯色等图案趋势变化。禁止只写"颜色丰富""印花多样"。
5. 禁止根据缺失数据强行推断；如数据不足，只能写"从本周 Top 款表现看"。
6. 输出控制在 400–600 字。
7. 取消"下期动作"模块，不输出具体执行动作清单。

数据说明：传入数据包含 curNewTop15/curOldTop15（本周新老品 Top15）、cmpNewTop15/cmpOldTop15（上周新老品 Top15），每款 SKC 包含：secondCategory（二级品类）、thirdCategory（三级品类/场合）、firstSecondColor（首复色：首色=该 SKC 版型+颜色首次上架时的颜色；复色=在热销老款版型基础上新增的颜色，非全新版型）、sales、uv、ctr、cvr、uvOutput 等字段。

输出格式（严格按以下格式，不使用 # 标题符号）：
一、本周二级品类结构（本周 vs 上周分布变化）
二、本周畅销元素特征（款式结构、颜色、印花、设计细节各一段，重点写本周高频元素）
三、本周相较上周的变化（哪些元素增强/减弱，结合销售/UV 表现解释）
四、机会点（2-3条：哪些元素/品类值得下周放大）

禁止：禁止输出"同比""去年同期""两年对比"；禁止输出"新老品占比对比"；禁止把 Beachwear/夏季旺季/价格带作为核心结论；禁止逐款复述 SKC；禁止输出"下期动作"；禁止超过 600 字。`,
};;

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
