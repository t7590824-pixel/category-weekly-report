import { invokeDifyWorkflow, isDifyConfigured } from "./dify";
import { invokeLLM } from "./llm";

export type InvokeAnalysisParams = {
  moduleKey: string;
  systemPrompt: string;
  parsedData: unknown;
};

export async function invokeAnalysisModel({
  moduleKey,
  systemPrompt,
  parsedData,
}: InvokeAnalysisParams) {
  const dataJson = JSON.stringify(parsedData, null, 2);
  const userPrompt = `数据如下：\n${dataJson}`;

  if (isDifyConfigured()) {
    return invokeDifyWorkflow({
      module_key: moduleKey,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      module_data_json: dataJson,
    });
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim()
    ? content.trim()
    : "分析生成失败，请重试。";
}
