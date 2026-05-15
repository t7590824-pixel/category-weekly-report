import { invokeDifyWorkflow, isDifyConfigured } from "./dify";
import { invokeLLM } from "./llm";

export type InvokeAnalysisParams = {
  moduleKey: string;
  systemPrompt: string;
  parsedData: unknown;
};

const GLOBAL_ANALYSIS_RULES = `全局输出硬性规则：
1. 只输出中文运营复盘正文，不要输出 Markdown 标题、表格、代码块、引用块或分隔线。
2. 不要使用 emoji、图标、口号式开头、客套话或“以下是”等铺垫。
3. 不要自行编造数据；只能引用输入数据中已有的指标和变化。
4. 如果模块 prompt 已指定固定格式，必须优先遵守该模块格式。
5. 输出要像电商品类运营周报/月报里的分析段落，简洁、直接、可贴进报表。
6. 除非模块 prompt 明确要求分点，否则用连续短段落输出。`;

const buildSystemPrompt = (systemPrompt: string) =>
  `${GLOBAL_ANALYSIS_RULES}\n\n模块专属规则：\n${systemPrompt}`;

const buildUserPrompt = (dataJson: string) => `数据如下：
${dataJson}

最终输出前请再次自检：
- 必须严格遵守上方“模块专属规则”里的格式和话术要求。
- 不要输出 Markdown 标题、表格、代码块、emoji 或装饰性分隔线。
- 不要把数据重新整理成通用报告，只输出可直接放进 Manus 原报表 AI 分析框的文案。`;

const EMOJI_REGEX =
  /(?:[\u2600-\u27bf]|[\ud83c-\ud83e][\udc00-\udfff]|\ud83d[\udc00-\udfff])/g;

const TABLE_SEPARATOR_REGEX =
  /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;

function cleanAnalysisLine(line: string) {
  return line
    .replace(/^\s{0,3}#{1,6}\s*/g, "")
    .replace(/^\s*[-*+•]\s+/g, "")
    .replace(/^\s*\d+[.)]\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(EMOJI_REGEX, "")
    .trim();
}

function sanitizeAnalysisText(text: string) {
  const cleanedLines: string[] = [];
  let inCodeFence = false;

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    if (!line) {
      cleanedLines.push("");
      continue;
    }

    if (/^[-*_]{3,}$/.test(line) || TABLE_SEPARATOR_REGEX.test(line)) {
      continue;
    }

    let nextLine = rawLine;
    if (nextLine.includes("|")) {
      nextLine = nextLine
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
        .join("，");
    }

    const cleanedLine = cleanAnalysisLine(nextLine);
    if (!cleanedLine || /^(以下是|根据数据显示|总体来看|建议如下)[:：]?$/.test(cleanedLine)) {
      continue;
    }

    cleanedLines.push(cleanedLine);
  }

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finalizeAnalysisText(text: unknown) {
  if (typeof text !== "string") {
    return "分析生成失败，请重试。";
  }

  const sanitizedText = sanitizeAnalysisText(text);
  return sanitizedText || "分析生成失败，请重试。";
}

export async function invokeAnalysisModel({
  moduleKey,
  systemPrompt,
  parsedData,
}: InvokeAnalysisParams) {
  const dataJson = JSON.stringify(parsedData, null, 2);
  const userPrompt = buildUserPrompt(dataJson);
  const guardedSystemPrompt = buildSystemPrompt(systemPrompt);

  if (isDifyConfigured()) {
    const analysisText = await invokeDifyWorkflow({
      module_key: moduleKey,
      system_prompt: guardedSystemPrompt,
      user_prompt: userPrompt,
      module_data_json: dataJson,
    });
    return finalizeAnalysisText(analysisText);
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: guardedSystemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  return finalizeAnalysisText(content);
}
