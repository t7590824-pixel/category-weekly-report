import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, FileText, CheckCircle2, AlertCircle, Download, ArrowLeft } from "lucide-react";

interface PeriodInfo {
  period: string;
  rowCount: number;
}

export default function MonthlyImport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [lastResult, setLastResult] = useState<{ periods: string[]; inserted: number; total: number } | null>(null);

  // 获取已导入的月份列表
  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/monthly-skc/periods");
      if (res.ok) {
        const data = await res.json();
        setPeriods(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // 上传 Excel/CSV 文件
  const handleUpload = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("格式错误：请上传 .xlsx 或 .csv 格式的文件");
      return;
    }
    setUploading(true);
    setLastResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/monthly-skc/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`导入失败：${data.error ?? "未知错误"}`);
        return;
      }
      setLastResult(data);
      toast.success(`导入成功：${data.periods.join("、")}，共 ${data.inserted} 行`);
      await fetchPeriods();
    } catch (err) {
      toast.error(`上传失败：${String(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 删除某月数据
  const handleDelete = async (period: string) => {
    if (!confirm(`确认删除 ${period} 的全部月度 SKC 数据？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/monthly-skc/${encodeURIComponent(period)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`删除失败：${data.error}`);
        return;
      }
      toast.success(`${period} 数据已删除（${data.deleted} 行）`);
      await fetchPeriods();
    } catch (err) {
      toast.error(`删除失败：${String(err)}`);
    }
  };

  // 下载 Excel 模板
  const downloadTemplate = () => {
    const headers = [
      "country",
      "business_year_and_week",
      "skc",
      "second_category",
      "third_category",
      "首次上架日期",
      "场合",
      "首复色",
      "销售额",
      "销量",
      "Collection页面商品曝光用户数",
      "Collection页面商品点击用户数",
      "PDP页面曝光用户数",
      "PDP页面加车按鈕点击用户数",
      "Checkout按鈕点击用户数",
      "月度新老品",
    ];
    const exampleRow = [
      "US",
      "2026年4月",
      "AA01A1A001A",
      "外套",
      "风衣",
      "2024/1/1",
      "Evening",
      "首色",
      1234.56,
      10,
      5000,
      200,
      1000,
      80,
      50,
      "新品",
    ];
    // 创建工作表
    const wb = (window as any).__XLSX_WB__ ?? (() => {
      // 动态导入 xlsx（已在 node_modules 中）
      return null;
    })();
    // 用原生 CSV 方式下载（浏览器不能直接用 xlsx）
    const csvRows = [headers.join(","), exampleRow.map(String).join(",")].join("\n");
    const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "月度SKC数据模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">月度 SKC 数据导入</h1>
          <p className="text-muted-foreground mt-1">
            由于 Google Sheets 单元格数量限制，月度 SKC 数据通过 Excel 文件导入到数据库存储。
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4" />
          返回报告
        </Button>
      </div>

      {/* 模板下载 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Excel / CSV 文件格式
          </CardTitle>
          <CardDescription>
            列名与“SKC基础数据表”（周度）完全一致，<code className="text-xs bg-muted px-1 rounded">business_year_and_week</code> 填月份（如 <code className="text-xs bg-muted px-1 rounded">2026年4月</code>）。
            支持 <strong>.xlsx</strong>（可用公式计算）和 .csv 格式，同一月份可重复导入自动覆盖。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="w-4 h-4" />
            下载模板（CSV）
          </Button>
        </CardContent>
      </Card>

      {/* 上传区域 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传 Excel / CSV 文件
          </CardTitle>
          <CardDescription>支持 .xlsx（推荐，可用公式）和 .csv 格式，最大 50MB，可包含多个月份的数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">正在导入，请稍候...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">点击或拖拽文件到此处</p>
                <p className="text-xs text-muted-foreground">支持 .xlsx（推荐）和 .csv 格式，最大 50MB</p>
              </div>
            )}
          </div>

          {/* 上传结果 */}
          {lastResult && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-700 dark:text-green-400">导入成功</p>
                  <p className="text-green-600 dark:text-green-500">
                    月份：{lastResult.periods.join("、")} · 共 {lastResult.inserted} 行
                  </p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setLocation("/")}>
                <ArrowLeft className="w-3.5 h-3.5" />
                返回报告
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 已导入的月份列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">已导入的月份</CardTitle>
          <CardDescription>点击删除按钮可清除该月份的全部数据</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPeriods ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <AlertCircle className="w-4 h-4" />
              暂无已导入的月度数据
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => (
                <div
                  key={p.period}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{p.period}</span>
                    <Badge variant="secondary" className="text-xs">
                      {Number(p.rowCount).toLocaleString()} 行
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(p.period)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
