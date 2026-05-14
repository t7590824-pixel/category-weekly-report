import { ENV } from "./env";

export type DifyWorkflowInputs = {
  module_key: string;
  system_prompt: string;
  user_prompt: string;
  module_data_json: string;
};

type DifyWorkflowResponse = {
  data?: {
    status?: string;
    error?: string;
    outputs?: Record<string, unknown>;
  };
  message?: string;
};

const resolveWorkflowUrl = () => {
  const base = ENV.difyApiUrl.trim().replace(/\/$/, "");
  if (!base) return "";
  if (base.endsWith("/workflows/run")) return base;
  if (base.endsWith("/v1")) return `${base}/workflows/run`;
  return `${base}/v1/workflows/run`;
};

export const isDifyConfigured = () => Boolean(resolveWorkflowUrl() && ENV.difyApiKey);

const readTextOutput = (outputs: Record<string, unknown> | undefined) => {
  if (!outputs) return "";

  const preferredKeys = [
    "analysis_text",
    "answer",
    "text",
    "output",
    "result",
  ];

  for (const key of preferredKeys) {
    const value = outputs[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(outputs)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

export async function invokeDifyWorkflow(inputs: DifyWorkflowInputs) {
  const url = resolveWorkflowUrl();
  if (!url || !ENV.difyApiKey) {
    throw new Error("DIFY_API_URL or DIFY_API_KEY is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.difyApiKey}`,
    },
    body: JSON.stringify({
      inputs,
      response_mode: "blocking",
      user: ENV.difyUser,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dify workflow failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const payload = (await response.json()) as DifyWorkflowResponse;
  if (payload.data?.status === "failed") {
    throw new Error(payload.data.error || "Dify workflow failed");
  }

  const analysis = readTextOutput(payload.data?.outputs);
  if (!analysis) {
    throw new Error("Dify workflow returned no analysis text");
  }

  return analysis;
}
