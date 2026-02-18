/**
 * Analytics Dashboard – Professional (Clean KPIs)
 */
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Clock,
  MessageSquare,
  Users,
  RefreshCw,
  Activity,
  PieChart,
  AlertTriangle,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

interface FeedbackItem {
  key: string;
  value: number;
}

interface AnalyticsData {
  totalQueries: number;
  avgResponseTime: number;
  activeUsers: number;
  failedRequests: number;
  errorRate: number;
  feedbackChart: FeedbackItem[];
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { t } = useLang();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const totalQueries = Math.floor(200 + Math.random() * 300);
      const failedRequests = Math.floor(5 + Math.random() * 20);
      const errorRate = +(failedRequests / totalQueries * 100).toFixed(2);

      setData({
        totalQueries,
        activeUsers: Math.floor(5 + Math.random() * 20),
        avgResponseTime: +(2 + Math.random() * 2).toFixed(1),
        failedRequests,
        errorRate,
        feedbackChart: [
          { key: 'analytics.feedback.positive', value: Math.floor(60 + Math.random() * 30) },
          { key: 'analytics.feedback.negative', value: Math.floor(10 + Math.random() * 15) },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 pt-0 px-0 bg-app mac-tab-animate">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">

          <h2 className="text-[1.125rem] font-semibold text-foreground dark:text-white transition-colors">

            {t('analytics.title')}
          </h2>
        </div>

        <div className="flex gap-1 bg-surface dark:bg-dark-surface border border-default rounded-xl p-1 shadow-sm transition-colors">
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === r
                  ? 'btn-primary text-on-accent'
                  : 'text-muted dark:text-dark-text-muted hover:bg-surface-alt dark:hover:bg-dark-border'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric
          title={t('analytics.totalQueries')}
          value={data.totalQueries}
          icon={MessageSquare}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          iconBg="bg-purple-100 dark:bg-purple-900/40"
          iconColor="text-purple-600 dark:text-purple-300"
          border="border-purple-200 dark:border-purple-800/50"
          animated={true}
        />
        <Metric
  title={t('analytics.avgResponseTime')}
  value={`${data.avgResponseTime}s`}
  icon={Clock}
  bgColor="bg-green-50 dark:bg-green-900/20"
iconBg="bg-green-100 dark:bg-green-900/40"
iconColor="text-green-600 dark:text-green-300"
border="border-green-200 dark:border-green-800/50"
  animated={true}
/>
        <Metric
          title={t('analytics.activeUsers')}
          value={data.activeUsers}
          icon={Users}
          bgColor="bg-orange-50 dark:bg-orange-900/20"
          iconBg="bg-orange-100 dark:bg-orange-900/40"
          iconColor="text-orange-600 dark:text-orange-300"
          border="border-orange-200 dark:border-orange-800/50"
          animated={true}
        />
      </div>

      {/* GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback */}
        <div className="bg-white dark:bg-[#0f1724] border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-yellow-500" />
            {t('analytics.feedbackQuality')}
          </h3>

          {data.feedbackChart.map((f, i) => {
            const isPositive = f.key.includes('positive');
            return (
              <div key={i} className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">{t(f.key)}</span>
                  <span className="font-medium">{f.value}%</span>
                </div>
                <div className="h-2.5 bg-[#F6F6F6] rounded-full">
                  <div
                    className={`h-2.5 rounded-full ${isPositive ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: `${f.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Rate */}
        <div className="bg-white dark:bg-[#0f1724] border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-600" />
            {t('analytics.errorFailureRate')}
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between p-3 bg-[#F6F6F6] rounded-xl">
              <span>{t('analytics.failedRequests')}</span>
              <span className="font-semibold">{data.failedRequests}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#F6F6F6] rounded-xl">
              <span>{t('analytics.errorRate')}</span>
              <span className="font-semibold">{data.errorRate}%</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes wobbleOnHover {
          0%, 100% {
            transform: translateY(-8px);
          }
          25% {
            transform: translateY(-8px) translateX(-2px);
          }
          50% {
            transform: translateY(-8px);
          }
          75% {
            transform: translateY(-8px) translateX(2px);
          }
        }
        
        .metric-card-animated {
          transition: all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        
        .metric-card-animated:hover {
          animation: wobbleOnHover 0.9s ease-in-out;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

/* KPI CARD */
function Metric({ title, value, icon: Icon, bgColor, iconBg, iconColor, border, animated = false }: any) {
  return (
    <div className={`${bgColor} ${border} border rounded-2xl p-5 shadow-sm ${animated ? 'metric-card-animated' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
