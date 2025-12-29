/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Reports() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [clientId, setClientId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");
  const [purchaseStatus, setPurchaseStatus] = useState<string>("all");
  const [expenseStatus, setExpenseStatus] = useState<string>("all");
  const [installmentStatus, setInstallmentStatus] = useState<string>("all");
  const { data: clients } = trpc.clients.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: projects } = trpc.projects.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data, refetch, isLoading } = trpc.reports.summary.useQuery(
    {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      clientId: clientId === "all" ? undefined : Number(clientId),
      projectId: projectId === "all" ? undefined : Number(projectId),
      invoiceStatus: invoiceStatus === "all" ? undefined : (invoiceStatus as any),
      purchaseStatus: purchaseStatus === "all" ? undefined : (purchaseStatus as any),
      expenseStatus: expenseStatus === "all" ? undefined : (expenseStatus as any),
      installmentStatus: installmentStatus === "all" ? undefined : (installmentStatus as any),
    },
    { refetchOnWindowFocus: false }
  );
  const { data: timeseries, isLoading: tsLoading, refetch: tsRefetch } = trpc.reports.timeseries.useQuery(
    {
      from: from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1),
      to: to ? new Date(to) : new Date(),
      granularity: "month",
      clientId: clientId === "all" ? undefined : Number(clientId),
      projectId: projectId === "all" ? undefined : Number(projectId),
      invoiceStatus: invoiceStatus === "all" ? undefined : (invoiceStatus as any),
      purchaseStatus: purchaseStatus === "all" ? undefined : (purchaseStatus as any),
      expenseStatus: expenseStatus === "all" ? undefined : (expenseStatus as any),
      installmentStatus: installmentStatus === "all" ? undefined : (installmentStatus as any),
    },
    { refetchOnWindowFocus: false }
  );
  const chartRef = useRef<any>(null);
  const csvRows = useMemo(() => {
    const rows = [["التاريخ", "الفواتير", "التكاليف التشغيلية", "المصروفات", "الصافي"]];
    (timeseries || []).forEach(r => {
      rows.push([r.dateKey, String(r.invoices), String(r.installments), String(r.expenses), String(r.net)]);
    });
    return rows;
  }, [timeseries]);
  const buildQuery = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (clientId !== "all") q.set("clientId", clientId);
    if (projectId !== "all") q.set("projectId", projectId);
    if (invoiceStatus !== "all") q.set("invoiceStatus", invoiceStatus);
    if (purchaseStatus !== "all") q.set("purchaseStatus", purchaseStatus);
    if (expenseStatus !== "all") q.set("expenseStatus", expenseStatus);
    if (installmentStatus !== "all") q.set("installmentStatus", installmentStatus);
    return q.toString();
  };
  const buildBreakdownQuery = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (clientId !== "all") q.set("clientId", clientId);
    if (projectId !== "all") q.set("projectId", projectId);
    invSel.forEach(s => q.append("invoiceStatuses", s));
    purSel.forEach(s => q.append("purchaseStatuses", s));
    expSel.forEach(s => q.append("expenseStatuses", s));
    instSel.forEach(s => q.append("installmentStatuses", s));
    return q.toString();
  };
  const downloadCsv = (rows: string[][], filename: string) => {
    const content = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const chartData = useMemo(() => {
    const labels = (timeseries || []).map(r => r.dateKey);
    return {
      labels,
      datasets: [
        { label: "الفواتير", data: (timeseries || []).map(r => r.invoices), borderColor: "#16a34a", backgroundColor: "#16a34a40", tension: 0.2 },
        { label: "التكاليف التشغيلية", data: (timeseries || []).map(r => r.installments), borderColor: "#3b82f6", backgroundColor: "#3b82f640", tension: 0.2 },
        { label: "المصروفات", data: (timeseries || []).map(r => r.expenses), borderColor: "#ef4444", backgroundColor: "#ef444440", tension: 0.2 },
        { label: "الصافي", data: (timeseries || []).map(r => r.net), borderColor: "#9333ea", backgroundColor: "#9333ea40", tension: 0.2 },
      ],
    };
  }, [timeseries]);
  const [invSel, setInvSel] = useState<string[]>(["paid", "sent"]);
  const [purSel, setPurSel] = useState<string[]>(["completed", "pending"]);
  const [expSel, setExpSel] = useState<string[]>(["active"]);
  const [instSel, setInstSel] = useState<string[]>(["pending", "paid"]);
  const { data: breakdown, isLoading: bdLoading, refetch: bdRefetch } = trpc.reports.timeseriesBreakdown.useQuery(
    {
      from: from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1),
      to: to ? new Date(to) : new Date(),
      granularity: "month",
      clientId: clientId === "all" ? undefined : Number(clientId),
      projectId: projectId === "all" ? undefined : Number(projectId),
      invoiceStatuses: invSel as any,
      purchaseStatuses: purSel as any,
      expenseStatuses: expSel as any,
      installmentStatuses: instSel as any
    },
    { refetchOnWindowFocus: false }
  );
  const breakdownData = useMemo(() => {
    const rows = ((breakdown || []) as any[]);
    const labels = rows.map(r => r.dateKey);
    const ds: any[] = [];
    const colorsInv: Record<string, string> = { draft: "#9CA3AF", sent: "#F59E0B", paid: "#16A34A", cancelled: "#EF4444" };
    const colorsPur: Record<string, string> = { pending: "#A78BFA", completed: "#22C55E", cancelled: "#EF4444" };
    const colorsExp: Record<string, string> = { active: "#EF4444", cancelled: "#9CA3AF" };
    const colorsInst: Record<string, string> = { pending: "#F59E0B", paid: "#22C55E", overdue: "#DC2626", cancelled: "#9CA3AF" };
    invSel.forEach(st => {
      ds.push({
        label: `الفواتير: ${st}`,
        data: rows.map(r => (r.invoices || {})[st] || 0),
        borderColor: colorsInv[st] || "#6B7280",
        backgroundColor: (colorsInv[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    purSel.forEach(st => {
      ds.push({
        label: `المشتريات: ${st}`,
        data: rows.map(r => (r.purchases || {})[st] || 0),
        borderColor: colorsPur[st] || "#6B7280",
        backgroundColor: (colorsPur[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    expSel.forEach(st => {
      ds.push({
        label: `المصروفات: ${st}`,
        data: rows.map(r => (r.expenses || {})[st] || 0),
        borderColor: colorsExp[st] || "#6B7280",
        backgroundColor: (colorsExp[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    instSel.forEach(st => {
      ds.push({
        label: `التكاليف: ${st}`,
        data: rows.map(r => (r.installments || {})[st] || 0),
        borderColor: colorsInst[st] || "#6B7280",
        backgroundColor: (colorsInst[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    return { labels, datasets: ds };
  }, [breakdown, invSel, purSel, expSel, instSel]);
  const breakdownCsv = useMemo(() => {
    const statuses: string[] = [
      ...invSel.map(s => `inv:${s}`),
      ...purSel.map(s => `pur:${s}`),
      ...expSel.map(s => `exp:${s}`),
      ...instSel.map(s => `inst:${s}`),
    ];
    const header = ["date", ...statuses];
    const rows: string[][] = [header];
    (breakdown || []).forEach((r: any) => {
      const row: string[] = [r.dateKey];
      statuses.forEach((h) => {
        const [group, name] = h.split(":");
        const map = group === "inv" ? r.invoices : group === "pur" ? r.purchases : group === "exp" ? r.expenses : r.installments || {};
        const val = (map || {})[name] || 0;
        row.push(String(val));
      });
      rows.push(row);
    });
    return rows;
  }, [breakdown, invSel, purSel, expSel, instSel]);
  const canExportCsv = useMemo(() => (timeseries || []).length > 0, [timeseries]);
  const canExportBreakdown = useMemo(() => (breakdown || []).length > 0, [breakdown]);
  const exportPdf = () => {
    try {
      const img = chartRef.current?.toBase64Image?.() || "";
      const html = `
        <html><head><meta charset="utf-8"><title>Reports</title>
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto; padding:24px}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .card{border:1px solid #ddd;border-radius:8px;padding:12px}
          img{max-width:100%}
        </style></head>
        <body>
          <h1>التقارير</h1>
          <div class="grid">
            <div class="card"><div>إجمالي الفواتير</div><h2>${data?.invoicesTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي التكاليف التشغيلية</div><h2>${data?.installmentsTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي المصروفات</div><h2>${data?.expensesTotal ?? 0}</h2></div>
            <div class="card"><div>الصافي</div><h2>${data?.net ?? 0}</h2></div>
          </div>
          ${img ? `<h2>المخطط</h2><img id="chartImg" src="${img}" />` : "<div style='margin-top:16px;color:#6b7280'>لا يوجد مخطط لطباعته</div>"}
          <script>
            function readyToPrint(){
              try {
                window.focus();
                setTimeout(function(){ window.print(); }, 150);
              } catch {}
            }
            var pic = document.getElementById('chartImg');
            if (pic) {
              pic.onload = readyToPrint;
              setTimeout(readyToPrint, 400);
            } else {
              setTimeout(readyToPrint, 150);
            }
          </script>
        </body></html>`;
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch { }
  };
  const exportServerPdf = () => {
    const qs = buildQuery();
    window.open(`/reports.print.html?${qs}`, "_blank");
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">التقارير</h1>
            <p className="text-muted-foreground">ملخص الإيرادات والمصروفات خلال فترة محددة</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>نطاق التاريخ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-7 gap-3">
              <div>
                <label className="text-sm">من</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">إلى</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">العميل</label>
                <Select value={clientId} onValueChange={(v) => setClientId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {(clients || []).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">المشروع</label>
                <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {(projects || []).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">حالة الفاتورة</label>
                <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="sent">مرسلة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">حالة المشتريات</label>
                <Select value={purchaseStatus} onValueChange={(v) => setPurchaseStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">حالة المصروفات</label>
                <Select value={expenseStatus} onValueChange={(v) => setExpenseStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">حالة التكاليف التشغيلية</label>
                <Select value={installmentStatus} onValueChange={(v) => setInstallmentStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="overdue">متأخر</SelectItem>
                    <SelectItem value="cancelled">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => { refetch(); tsRefetch(); }} disabled={isLoading || tsLoading}>تحديث</Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/reports.export.csv?${buildQuery()}`, "_blank")}
                disabled={!canExportCsv}
              >
                تصدير CSV
              </Button>
              <Button variant="outline" onClick={exportServerPdf} disabled={isLoading && tsLoading}>
                تصدير PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/reports.breakdown.csv?${buildBreakdownQuery()}`, "_blank")}
                disabled={!canExportBreakdown}
              >
                تفصيل CSV
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ملخص مالي</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse grid md:grid-cols-2 gap-4">
                <div className="h-24 bg-muted rounded"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">إجمالي الفواتير</div>
                  <div className="text-2xl font-bold">{data?.invoicesTotal ?? 0}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">إجمالي التكاليف التشغيلية</div>
                  <div className="text-2xl font-bold">{data?.installmentsTotal ?? 0}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
                  <div className="text-2xl font-bold">{data?.expensesTotal ?? 0}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-muted-foreground">إجمالي المشتريات</div>
                  <div className="text-2xl font-bold">{data?.purchasesTotal ?? 0}</div>
                </div>
                <div className="p-4 border rounded md:col-span-2">
                  <div className="text-sm text-muted-foreground">الصافي</div>
                  <div className="text-3xl font-bold">{data?.net ?? 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>مخطط زمني</CardTitle>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : (
              <Line
                ref={chartRef}
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>تفصيل حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <div className="text-sm mb-2">حالات الفواتير</div>
                <div className="flex flex-col gap-2">
                  {["draft", "sent", "paid", "cancelled"].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={invSel.includes(s)}
                        onCheckedChange={(v) => {
                          setInvSel(prev => {
                            const set = new Set(prev);
                            if (v) set.add(s); else set.delete(s);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm mb-2">حالات المشتريات</div>
                <div className="flex flex-col gap-2">
                  {["pending", "completed", "cancelled"].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={purSel.includes(s)}
                        onCheckedChange={(v) => {
                          setPurSel(prev => {
                            const set = new Set(prev);
                            if (v) set.add(s); else set.delete(s);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm mb-2">حالات المصروفات</div>
                <div className="flex flex-col gap-2">
                  {["active", "cancelled"].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={expSel.includes(s)}
                        onCheckedChange={(v) => {
                          setExpSel(prev => {
                            const set = new Set(prev);
                            if (v) set.add(s); else set.delete(s);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm mb-2">حالات التكاليف التشغيلية</div>
                <div className="flex flex-col gap-2">
                  {["pending", "paid", "overdue", "cancelled"].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={instSel.includes(s)}
                        onCheckedChange={(v) => {
                          setInstSel(prev => {
                            const set = new Set(prev);
                            if (v) set.add(s); else set.delete(s);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={() => bdRefetch()} disabled={bdLoading}>تحديث التفصيل</Button>
              </div>
            </div>
            {bdLoading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : (
              <Line
                data={breakdownData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
