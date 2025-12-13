import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function AuthHealth() {
  const { data, isLoading } = trpc.auth.health.useQuery();
  const Row = ({ label, ok }: { label: string; ok: boolean }) => (
    <div className="flex items-center justify-between p-2 border rounded">
      <span className="text-sm">{label}</span>
      {ok ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
      )}
    </div>
  );
  if (isLoading || !data) return <div className="h-20 bg-muted rounded animate-pulse" />;
  return (
    <Card className="col-span-2">
      <CardContent className="space-y-2 p-4">
        <Row label="سر الكوكيز مضبوط" ok={data.hasCookieSecret} />
        <Row label="رابط خادم OAuth مضبوط" ok={data.hasOAuthServerUrl} />
        <Row label="مصدر الواجهة مضبوط" ok={data.serverOriginSet} />
        <Row label="الوضع إنتاج" ok={data.isProduction} />
      </CardContent>
    </Card>
  );
}
