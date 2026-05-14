import { trpc } from "@/lib/trpc";
import FeishuLogin from "@/pages/FeishuLogin";
import type { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * 路由保护组件：未登录时展示飞书登录页，已登录时渲染子组件。
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 加载中：显示空白或 spinner
  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 未登录：展示飞书登录页
  if (!meQuery.data) {
    return <FeishuLogin />;
  }

  // 已登录：渲染受保护的内容
  return <>{children}</>;
}
