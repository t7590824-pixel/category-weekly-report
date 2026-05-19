import { ENV } from "./env";

export type HengshiSkcTag = {
  skc: string;
  secondCategory: string | null;
  thirdCategory: string | null;
  primaryColorSystem: string | null;
  primaryPattern: string | null;
  designDetails: string | null;
  shape: string | null;
  collarShape: string | null;
  sleeveLength: string | null;
  dressLength: string | null;
  fabricTypes: string | null;
  occasion: string | null;
  occasionZh: string | null;
  strapType: string | null;
  skirtType: string | null;
};

type HengshiTokenResponse = {
  access_token?: string;
};

type HengshiDatasetResponse = {
  code?: number;
  msg?: string;
  data?: {
    schema?: Array<{ fieldName: string }>;
    data?: unknown[][];
  };
};

const CACHE_TTL_MS = 30 * 60 * 1000;

const OCCASION_TRANSLATIONS: Record<string, string> = {
  beach: "沙滩海边",
  poolside: "泳池边",
  tropical: "热带风情",
  vacationstay: "度假住宿/酒店别墅",
  cruise: "邮轮/游艇/船上度假",
  islandcoast: "海岛/海岸/码头小镇",
  lakecanalriver: "湖泊/河畔/运河",
  watersports: "水上运动",
  roadtrip: "公路旅行/自驾/露营车",
  traveltransit: "旅行中转/机场车站",
  vacationtravel: "旅行度假/观光出游",
  gardenpicnic: "花园/野餐",
  citystreet: "城市街拍",
  cafebrunch: "咖啡馆/早午餐",
  musicfestival: "音乐节/户外派对",
  outdooradventure: "户外探索",
  skiresort: "雪山/滑雪/滑雪小镇",
  spawellness: "温泉/SPA/水疗/桑拿",
  weddingevent: "婚礼/正式活动",
  partynightout: "派对/夜晚社交",
  datenight: "约会",
  dailycasual: "日常生活",
  holidaywinter: "节日/冬季",
  studio: "棚拍/无场景",
};

const TARGET_FIELDS = [
  "skc",
  "second_category",
  "third_category",
  "primary_color_system",
  "primary_pattern",
  "design_details",
  "shape",
  "collar_shape",
  "sleeve_length",
  "dress_length",
  "fabric_types",
  "occasion",
  "strap_type",
  "skirt_type",
] as const;

let hengshiCache:
  | {
      ts: number;
      map: Map<string, HengshiSkcTag>;
    }
  | null = null;

const isConfigured = () =>
  Boolean(
    ENV.hengshiSkcBaseUrl &&
      ENV.hengshiClientId &&
      ENV.hengshiClientSecret,
  );

function normalizeTagValue(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "未知" || trimmed === "暂无面料属性") return null;
  return trimmed;
}

function normalizeOccasion(value: string | null) {
  if (!value) return { occasion: null, occasionZh: null };
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return {
    occasion: value,
    occasionZh: OCCASION_TRANSLATIONS[key] ?? value,
  };
}

async function fetchToken() {
  const tokenUrl =
    `https://hengshi-eu.kapeixi.cn/api/oauth2/server/tokens` +
    `?grant_type=client_credentials` +
    `&client_id=${encodeURIComponent(ENV.hengshiClientId)}` +
    `&client_secret=${encodeURIComponent(ENV.hengshiClientSecret)}`;

  const response = await fetch(tokenUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Hengshi token failed: ${response.status}`);
  }

  const payload = (await response.json()) as HengshiTokenResponse;
  if (!payload.access_token) {
    throw new Error("Hengshi token missing access_token");
  }

  return payload.access_token;
}

async function loadFullTagMap() {
  const now = Date.now();
  if (hengshiCache && now - hengshiCache.ts < CACHE_TTL_MS) {
    return hengshiCache.map;
  }

  if (!isConfigured()) {
    return new Map<string, HengshiSkcTag>();
  }

  const token = await fetchToken();
  const connector = ENV.hengshiSkcBaseUrl.includes("?") ? "&" : "?";
  const response = await fetch(
    `${ENV.hengshiSkcBaseUrl}${connector}access_token=${encodeURIComponent(token)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(`Hengshi dataset failed: ${response.status}`);
  }

  const payload = (await response.json()) as HengshiDatasetResponse;
  const schema = payload.data?.schema ?? [];
  const rows = payload.data?.data ?? [];
  const fields = schema.map((item) => item.fieldName);
  const fieldIndexes = new Map<string, number>();

  for (const field of TARGET_FIELDS) {
    fieldIndexes.set(field, fields.indexOf(field));
  }

  const map = new Map<string, HengshiSkcTag>();

  for (const row of rows) {
    const skcIndex = fieldIndexes.get("skc") ?? -1;
    const skc = normalizeTagValue(skcIndex >= 0 ? row[skcIndex] : null);
    if (!skc) continue;

    const occasionRaw = normalizeTagValue(
      row[fieldIndexes.get("occasion") ?? -1],
    );
    const { occasion, occasionZh } = normalizeOccasion(occasionRaw);

    map.set(skc, {
      skc,
      secondCategory: normalizeTagValue(
        row[fieldIndexes.get("second_category") ?? -1],
      ),
      thirdCategory: normalizeTagValue(
        row[fieldIndexes.get("third_category") ?? -1],
      ),
      primaryColorSystem: normalizeTagValue(
        row[fieldIndexes.get("primary_color_system") ?? -1],
      ),
      primaryPattern: normalizeTagValue(
        row[fieldIndexes.get("primary_pattern") ?? -1],
      ),
      designDetails: normalizeTagValue(
        row[fieldIndexes.get("design_details") ?? -1],
      ),
      shape: normalizeTagValue(row[fieldIndexes.get("shape") ?? -1]),
      collarShape: normalizeTagValue(
        row[fieldIndexes.get("collar_shape") ?? -1],
      ),
      sleeveLength: normalizeTagValue(
        row[fieldIndexes.get("sleeve_length") ?? -1],
      ),
      dressLength: normalizeTagValue(
        row[fieldIndexes.get("dress_length") ?? -1],
      ),
      fabricTypes: normalizeTagValue(
        row[fieldIndexes.get("fabric_types") ?? -1],
      ),
      occasion,
      occasionZh,
      strapType: normalizeTagValue(
        row[fieldIndexes.get("strap_type") ?? -1],
      ),
      skirtType: normalizeTagValue(
        row[fieldIndexes.get("skirt_type") ?? -1],
      ),
    });
  }

  hengshiCache = { ts: now, map };
  return map;
}

export async function getHengshiSkcTags(skcs: string[]) {
  if (!skcs.length) return new Map<string, HengshiSkcTag>();

  const uniqueSkcs = Array.from(
    new Set(skcs.map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
  const fullMap = await loadFullTagMap();
  const result = new Map<string, HengshiSkcTag>();

  for (const skc of uniqueSkcs) {
    const record = fullMap.get(skc);
    if (record) {
      result.set(skc, record);
    }
  }

  return result;
}
