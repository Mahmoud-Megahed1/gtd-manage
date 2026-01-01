import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartProps {
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
}

export default function RevenueChart({ monthlyData }: RevenueChartProps) {
  const chartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'الإيرادات',
        data: monthlyData.map(d => d.revenue),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
        barThickness: 20,
        borderRadius: 4,
      },
      {
        label: 'المصروفات',
        data: monthlyData.map(d => d.expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
        barThickness: 20,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
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
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString() + ' ر.س';
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Cairo, sans-serif',
          },
          callback: function (value: any) {
            return value.toLocaleString() + ' ر.س';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        ticks: {
          font: {
            family: 'Cairo, sans-serif',
          },
        },
        grid: {
          display: false,
        }
      }
    },
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}
