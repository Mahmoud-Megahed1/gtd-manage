import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// CACHE_BUST_VERSION: v3-Final-Fix
console.log('[ProjectsChart] v3 Final Fix loaded');
ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectsChartProps {
  data: {
    design: number;
    execution: number;
    design_execution: number;
    supervision: number;
    delivered: number;
    cancelled: number;
    in_progress: number;
  };
}

export default function ProjectsChart({ data }: ProjectsChartProps) {
  const chartData = {
    labels: ['تصميم', 'تنفيذ', 'تصميم وتنفيذ', 'إشراف', 'تم التسليم', 'ملغي'],
    datasets: [
      {
        label: 'عدد المشاريع',
        data: [
          data.design,
          data.execution,
          data.design_execution,
          data.supervision,
          data.delivered,
          data.cancelled
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // blue - تصميم
          'rgba(249, 115, 22, 0.8)',   // orange - تنفيذ
          'rgba(168, 85, 247, 0.8)',   // purple - تصميم وتنفيذ
          'rgba(234, 179, 8, 0.8)',    // yellow - إشراف
          'rgba(16, 185, 129, 0.8)',   // green - تم التسليم
          'rgba(239, 68, 68, 0.8)',    // red - ملغي
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: true,
        labels: {
          font: {
            family: 'Cairo, sans-serif',
            size: 12,
          },
          padding: 15,
        },
      },
      tooltip: {
        rtl: true,
        titleFont: {
          family: 'Cairo, sans-serif',
        },
        bodyFont: {
          family: 'Cairo, sans-serif',
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Pie data={chartData} options={options} />
    </div>
  );
}
