import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function FeishuLogin() {
  // 如果已经登录，跳转首页
  useEffect(() => {
    // 不做自动跳转，由 AuthGuard 控制
  }, []);

  const handleFeishuLogin = () => {
    // 跳转到后端飞书 OAuth 入口
    window.location.href = "/api/feishu";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="flex flex-col items-center gap-8">
          {/* Logo / 标题 */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" fillOpacity="0.15"/>
                <path d="M8 10h16M8 16h10M8 22h12" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">品类运营周报</h1>
              <p className="text-sm text-muted-foreground mt-1">Category Weekly Report</p>
            </div>
          </div>

          {/* 登录卡片 */}
          <div className="w-full bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-card-foreground">登录访问</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  请使用飞书账号登录，仅限内部成员访问
                </p>
              </div>

              <Button
                onClick={handleFeishuLogin}
                className="w-full h-11 gap-3 text-base font-medium"
                size="lg"
              >
                {/* 飞书图标 */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="white" fillOpacity="0.2"/>
                  <path d="M16.5 8.5c-1.5-1-3.5-1.5-5.5-1-2 .5-3.5 2-4 4 1-1 2.5-1.5 4-1.5 2 0 3.5 1 4.5 2.5.5.8.8 1.7.8 2.5 0 .3 0 .5-.1.8.8-.8 1.3-1.8 1.3-3 0-1.8-1-3.3-1-4.3z" fill="currentColor"/>
                  <path d="M7.5 15.5c1.5 1 3.5 1.5 5.5 1 2-.5 3.5-2 4-4-1 1-2.5 1.5-4 1.5-2 0-3.5-1-4.5-2.5-.5-.8-.8-1.7-.8-2.5 0-.3 0-.5.1-.8-.8.8-1.3 1.8-1.3 3 0 1.8 1 3.3 1 4.3z" fill="currentColor"/>
                </svg>
                使用飞书账号登录
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                登录即表示你属于授权的飞书组织成员
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
