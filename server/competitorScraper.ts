import axios from "axios";

export interface CompetitorBrand {
  name: string;
  url: string;
  bannerInfo: string;
  newArrivals: {
    dresses: string;
    bottoms: string;
    blouses: string;
  };
  scrapedAt: string;
}

// Cache competitor data for 6 hours
let competitorCache: { data: CompetitorBrand[]; ts: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

const BRANDS = [
  { name: "Next", url: "https://www.next.co.uk" },
  { name: "Nobody's Child", url: "https://www.nobodyschild.com" },
  { name: "M&S", url: "https://www.marksandspencer.com" },
];

async function scrapePageText(url: string): Promise<string> {
  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    const html: string = resp.data;
    // Extract text content by stripping HTML tags
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 8000);
  } catch {
    return "";
  }
}

async function scrapeBrand(brand: { name: string; url: string }): Promise<CompetitorBrand> {
  const homeText = await scrapePageText(brand.url);

  // Extract banner/promo info from homepage text
  const bannerKeywords = [
    "sale", "off", "new in", "new arrivals", "% off", "free delivery",
    "spring", "summer", "collection", "edit", "trend", "must-have",
    "exclusive", "limited", "shop now", "discover",
  ];

  const sentences = homeText.split(/[.!?]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200);
  const bannerSentences = sentences.filter((s) =>
    bannerKeywords.some((kw) => s.toLowerCase().includes(kw))
  ).slice(0, 5);

  const bannerInfo = bannerSentences.length
    ? bannerSentences.join(" | ")
    : "Homepage content could not be extracted";

  // Try to get new arrivals info for specific categories
  const categoryInfo = {
    dresses: await getCategoryInfo(brand.url, "dresses"),
    bottoms: await getCategoryInfo(brand.url, "trousers"),
    blouses: await getCategoryInfo(brand.url, "blouses"),
  };

  return {
    name: brand.name,
    url: brand.url,
    bannerInfo,
    newArrivals: categoryInfo,
    scrapedAt: new Date().toISOString(),
  };
}

async function getCategoryInfo(baseUrl: string, category: string): Promise<string> {
  // Build category URL based on brand
  const urlMap: Record<string, Record<string, string>> = {
    "https://www.next.co.uk": {
      dresses: "/shop/gender-women/category-dresses?srt=newIn",
      trousers: "/shop/gender-women/category-trousers?srt=newIn",
      blouses: "/shop/gender-women/category-tops?srt=newIn",
    },
    "https://www.nobodyschild.com": {
      dresses: "/collections/dresses",
      trousers: "/collections/trousers",
      blouses: "/collections/tops",
    },
    "https://www.marksandspencer.com": {
      dresses: "/l/women/dresses?sort=newest",
      trousers: "/l/women/trousers/all?sort=newest",
      blouses: "/l/women/tops-and-t-shirts/blouses?sort=newest",
    },
  };

  const paths = urlMap[baseUrl];
  if (!paths || !paths[category]) return "N/A";

  const url = baseUrl + paths[category];
  const text = await scrapePageText(url);

  // Extract product names/descriptions
  const productKeywords = ["floral", "stripe", "print", "linen", "cotton", "midi", "maxi", "mini",
    "wrap", "shift", "fit", "flare", "wide", "slim", "straight", "pleated", "ruched",
    "blue", "green", "pink", "white", "black", "red", "yellow", "beige", "cream",
    "new", "exclusive", "bestseller"];

  const words = text.toLowerCase().split(/\s+/);
  const found = productKeywords.filter((kw) => words.includes(kw));
  const uniqueFound = Array.from(new Set(found)).slice(0, 8);

  return uniqueFound.length ? uniqueFound.join(", ") : "Unable to extract trend data";
}

export async function getCompetitorData(forceRefresh = false): Promise<CompetitorBrand[]> {
  const now = Date.now();
  if (!forceRefresh && competitorCache && now - competitorCache.ts < CACHE_TTL) {
    return competitorCache.data;
  }

  const results = await Promise.allSettled(BRANDS.map(scrapeiBrand));
  const data = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: BRANDS[i].name,
      url: BRANDS[i].url,
      bannerInfo: "Failed to scrape: " + (r.reason as Error).message,
      newArrivals: { dresses: "N/A", bottoms: "N/A", blouses: "N/A" },
      scrapedAt: new Date().toISOString(),
    };
  });

  competitorCache = { data, ts: now };
  return data;
}

// Fix typo
async function scrapeiBrand(brand: { name: string; url: string }): Promise<CompetitorBrand> {
  return scrapeBrand(brand);
}
