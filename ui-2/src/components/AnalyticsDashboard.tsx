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
import { useLang } from '../context/LanguageContext';

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

      // store translation keys, not actual text
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
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#F6F6F6] dark:bg-dark-gradient mac-tab-animate">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1d2089] dark:bg-gradient-to-r dark:from-[#60a5fa] dark:to-[#a78bfa] rounded-xl transition-colors">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#232333] dark:text-white transition-colors">{t('analytics.title')}</h2>
        </div>

        <div className="flex gap-1 bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl p-1 shadow-sm transition-colors">
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === r
                  ? 'bg-[#1d2089] dark:bg-gradient-to-r dark:from-[#60a5fa] dark:to-[#a78bfa] text-white'
                  : 'text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-surface hover:text-[#232333] dark:hover:text-dark-text'
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
          color="blue"
        />
        <Metric
          title={t('analytics.activeUsers')}
          value={data.activeUsers}
          icon={Users}
          color="green"
        />
        <Metric
          title={t('analytics.avgResponseTime')}
          value={`${data.avgResponseTime}s`}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* GRAPHS / METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FEEDBACK DISTRIBUTION */}
        <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 shadow-sm transition-colors">
          <h3 className="text-[#232333] dark:text-dark-text font-semibold mb-4 flex items-center gap-2 transition-colors">
            <PieChart className="w-5 h-5 text-[#1d2089] dark:text-[#60a5fa] transition-colors" />{t('analytics.feedbackQuality')}
          </h3>

          <div className="space-y-4">
            {data.feedbackChart.map((f, i) => {
              const label = t(f.key);
              const isPositive = f.key.includes('positive');
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#6E7680]">{label}</span>
                    <span className="text-[#232333] font-medium">{f.value}%</span>
                  </div>
                  <div className="h-2.5 bg-[#F6F6F6] dark:bg-dark-border rounded-full transition-colors">
                    <div
                      className={`h-2.5 rounded-full ${isPositive ? 'bg-[#059669]' : 'bg-[#DC2626]'}`}
                      style={{ width: `${f.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ERROR / FAILURE METRIC */}
        <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 shadow-sm transition-colors">
          <h3 className="text-[#232333] dark:text-dark-text font-semibold mb-4 flex items-center gap-2 transition-colors">
            <AlertTriangle className="w-5 h-5 text-amber-500" />{t('analytics.errorFailureRate')}
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-[#F6F6F6] dark:bg-dark-border rounded-xl transition-colors">
              <span className="text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('analytics.failedRequests')}</span>
              <span className="text-[#232333] dark:text-dark-text font-semibold text-lg transition-colors">{data.failedRequests}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#F6F6F6] dark:bg-dark-border rounded-xl transition-colors">
              <span className="text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('analytics.errorRate')}</span>
              <span className="text-[#232333] dark:text-dark-text font-semibold text-lg transition-colors">{data.errorRate}%</span>
            </div>

            <div className="h-3 bg-[#F6F6F6] dark:bg-dark-border rounded-full transition-colors">
              <div
                className="h-3 bg-amber-500 rounded-full"
                style={{ width: `${Math.min(data.errorRate * 5, 100)}%` }}
              />
            </div>

            <p className="text-xs text-[#6E7680]">
              {t('analytics.errorRateDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* SYSTEM HEALTH */}
      <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 shadow-sm transition-colors">
        <h3 className="text-[#232333] dark:text-dark-text font-semibold mb-2 flex items-center gap-2 transition-colors">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg transition-colors">
            <Activity className="w-4 h-4 text-green-600" />
          </div>
          {t('analytics.systemHealth')}
        </h3>
        <p className="text-[#6E7680] dark:text-dark-text-muted text-sm transition-colorsxt-dark-text-muted text-sm transition-colors">
          {t('analytics.systemStatus')}
        </p>
      </div>
    </div>
  );
}

/* ---------------- KPI CARD ---------------- */
function Metric({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'green' | 'yellow';
}) {
  const iconBg: any = {
    blue: 'bg-[#F0F4FF]',
    green: 'bg-green-50',
    yellow: 'bg-amber-50',
  };

  const iconColor: any = {
    blue: 'text-[#1d2089]',
    green: 'text-green-600',
    yellow: 'text-amber-500',
  };

  return (
    <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#6E7680] dark:text-dark-text-muted text-sm mb-1 transition-colors">{title}</p>
          <p className="text-3xl font-bold text-[#232333] dark:text-dark-text transition-colors">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconBg[color]}`}>
          <Icon className={`w-6 h-6 ${iconColor[color]}`} />
        </div>
      </div>
    </div>
  );
}
