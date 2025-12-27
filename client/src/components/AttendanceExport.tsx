import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface AttendanceRecord {
    id: number;
    employeeId: number;
    date: Date | string;
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    status: string;
    hoursWorked?: number;
}

interface AttendanceExportProps {
    attendanceList: AttendanceRecord[];
}

export default function AttendanceExport({ attendanceList }: AttendanceExportProps) {
    const handleExport = () => {
        if (!attendanceList || attendanceList.length === 0) {
            return;
        }

        // Create CSV header
        const headers = ['employeeId', 'date', 'checkIn', 'checkOut', 'status', 'hoursWorked'];

        // Create CSV rows
        const rows = attendanceList.map(att => {
            const date = new Date(att.date).toISOString().split('T')[0];
            const checkIn = att.checkIn
                ? new Date(att.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : '';
            const checkOut = att.checkOut
                ? new Date(att.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : '';

            return [
                att.employeeId,
                date,
                checkIn,
                checkOut,
                att.status,
                att.hoursWorked || 0
            ].join(',');
        });

        // Combine header and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create and download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="outline" onClick={handleExport} disabled={!attendanceList?.length}>
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
        </Button>
    );
}
