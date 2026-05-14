/**
 * 飞书 OAuth 登录
 * 流程：
 * 1. GET /api/feishu → 重定向到飞书授权页
 * 2. GET /api/feishu/callback → 飞书回调，换取 access_token，获取用户信息，写 session cookie
 */
import axios from "axios";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const FEISHU_AUTHORIZE_URL = "https://open.feishu.cn/open-apis/authen/v1/authorize";
const FEISHU_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v2/oauth/token";
const FEISHU_USERINFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info";

/**
 * 获取飞书 OAuth 回调地址。
 * 优先使用环境变量 FEISHU_REDIRECT_BASE_URL（生产域名），
 * 避免使用内部 Cloud Run 地址导致飞书白名单校验失败。
 */
function getRedirectUri(req: Request): string {
  // 优先使用环境变量中配置的生产域名
  if (ENV.feishuRedirectBaseUrl) {
    return `${ENV.feishuRedirectBaseUrl}/api/feishu/callback`;
  }
  // 开发环境回退：从请求头推断
  const proto =
    req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ||
    req.protocol ||
    "https";
  const host = req.headers["x-forwarded-host"]?.toString() || req.headers.host || "";
  return `${proto}://${host}/api/feishu/callback`;
}

export function registerFeishuAuthRoutes(app: Express) {
  // Step 1: 跳转到飞书授权页
  app.get("/api/feishu", (req: Request, res: Response) => {
    const appId = ENV.feishuAppId;
    if (!appId) {
      res.status(500).json({ error: "FEISHU_APP_ID not configured" });
      return;
    }

    const redirectUri = getRedirectUri(req);
    const state = Buffer.from(redirectUri).toString("base64");

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    res.redirect(302, `${FEISHU_AUTHORIZE_URL}?${params.toString()}`);
  });

  // 兼容旧路径（/api/auth/feishu）
  app.get("/api/auth/feishu", (req: Request, res: Response) => {
    res.redirect(302, "/api/feishu");
  });

  // Step 2: 飞书回调，换取 token，写 session
  app.get("/api/feishu/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    // redirect_uri 必须与授权时完全一致
    const redirectUri = state
      ? Buffer.from(state, "base64").toString("utf-8")
      : getRedirectUri(req);

    try {
      // 换取 access_token
      const tokenRes = await axios.post(
        FEISHU_TOKEN_URL,
        {
          grant_type: "authorization_code",
          client_id: ENV.feishuAppId,
          client_secret: ENV.feishuAppSecret,
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const tokenData = tokenRes.data;
      // 飞书 v2 token 响应结构：{ access_token, token_type, expires_in, ... }
      const accessToken: string = tokenData.access_token || tokenData.data?.access_token;

      if (!accessToken) {
        console.error("[Feishu] Token exchange failed:", JSON.stringify(tokenData));
        res.status(400).json({ error: "Failed to obtain access token from Feishu" });
        return;
      }

      // 获取用户信息
      const userRes = await axios.get(FEISHU_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const userRaw = userRes.data;
      // 飞书 userinfo 响应：{ code, data: { open_id, name, email, ... } }
      const userInfo = userRaw.data || userRaw;
      const openId: string = userInfo.open_id || userInfo.openId;
      const name: string = userInfo.name || userInfo.en_name || "";
      const email: string = userInfo.enterprise_email || userInfo.email || "";

      if (!openId) {
        console.error("[Feishu] Missing open_id in user info:", JSON.stringify(userRaw));
        res.status(400).json({ error: "Missing open_id from Feishu user info" });
        return;
      }

      // 写入/更新数据库用户
      await db.upsertUser({
        openId,
        name: name || null,
        email: email || null,
        loginMethod: "feishu",
        lastSignedIn: new Date(),
      });

      // 签发 session JWT（复用现有机制）
      const sessionToken = await sdk.signSession(
        { openId, appId: ENV.appId || "feishu", name },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // 登录成功，跳转首页
      res.redirect(302, "/");
    } catch (error: any) {
      console.error("[Feishu] OAuth callback error:", error?.response?.data || error?.message || error);
      res.status(500).json({ error: "Feishu OAuth callback failed" });
    }
  });

  // 兼容旧路径（/api/auth/feishu/callback）
  app.get("/api/auth/feishu/callback", (req: Request, res: Response) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    res.redirect(302, `/api/feishu/callback${qs ? `?${qs}` : ""}`);
  });

  // 登出：清除 session cookie
  app.post("/api/feishu/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions });
    res.json({ success: true });
  });

  // 兼容旧路径
  app.post("/api/auth/feishu/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions });
    res.json({ success: true });
  });
}
