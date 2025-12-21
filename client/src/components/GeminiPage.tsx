/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

interface GeminiPageProps {
    pageUrl: string;
    onRefresh?: () => void;
}

export function GeminiPage({ pageUrl, onRefresh }: GeminiPageProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleLoad = () => {
        setLoading(false);
        setError(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    const handleRefresh = () => {
        setLoading(true);
        setError(false);
        // Force iframe reload by re-setting key
        if (onRefresh) {
            onRefresh();
        }
    };

    // Validate URL is HTTPS for security
    const isSecureUrl = pageUrl.startsWith('https://');

    if (!isSecureUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h3 className="text-xl font-semibold">رابط غير آمن</h3>
                <p className="text-muted-foreground max-w-md">
                    يجب أن يكون رابط الصفحة آمناً (HTTPS) لضمان حماية البيانات.
                </p>
                <code className="bg-muted px-3 py-1 rounded text-sm">{pageUrl}</code>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h3 className="text-xl font-semibold">فشل تحميل الصفحة</h3>
                <p className="text-muted-foreground max-w-md">
                    تعذر تحميل الصفحة. تأكد من صحة الرابط واتصال الإنترنت.
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 ml-2" />
                        إعادة المحاولة
                    </Button>
                    <Button variant="outline" asChild>
                        <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 ml-2" />
                            فتح في نافذة جديدة
                        </a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[80vh] rounded-lg overflow-hidden border">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <span className="text-muted-foreground">جاري تحميل الصفحة...</span>
                    </div>
                </div>
            )}

            <div className="absolute top-2 right-2 z-20">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefresh}
                    className="shadow-md"
                >
                    <RefreshCw className="h-4 w-4 ml-1" />
                    تحديث
                </Button>
            </div>

            <iframe
                src={pageUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleLoad}
                onError={handleError}
                title="Gemini Page"
                referrerPolicy="no-referrer"
            />
        </div>
    );
}

export default GeminiPage;
