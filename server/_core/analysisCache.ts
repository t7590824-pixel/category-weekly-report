import { createHash } from "node:crypto";

const MAX_CACHE_ITEMS = 200;
const analysisCache = new Map<string, string>();

export function buildAnalysisCacheKey(moduleKey: string, data: string) {
  const dataHash = createHash("sha256").update(data).digest("hex").slice(0, 24);
  return `${moduleKey}:${dataHash}`;
}

export function getCachedAnalysis(cacheKey: string) {
  return analysisCache.get(cacheKey) ?? null;
}

export function setCachedAnalysis(cacheKey: string, analysis: string) {
  if (analysisCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) {
      analysisCache.delete(oldestKey);
    }
  }

  analysisCache.set(cacheKey, analysis);
}

export function clearAnalysisCache() {
  analysisCache.clear();
}
