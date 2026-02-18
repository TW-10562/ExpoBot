import { MessageSquare, History, Bell, Shield } from 'lucide-react';
import { User, FeatureType } from '../types';
import Header from './Header';

interface HomePageProps {
  user: User;
  onFeatureClick: (feature: FeatureType) => void;
  onProfileClick: () => void;
  onNotificationClick: () => void;
  onSettingsClick: () => void;
  unreadCount: number;
}

interface Feature {
  id: FeatureType;
  title: string;
  icon: React.ReactNode;
  gradient: string;
  adminOnly?: boolean;
}

export default function HomePage({
  user,
  onFeatureClick,
  onProfileClick,
  onNotificationClick,
  onSettingsClick,
  unreadCount,
}: HomePageProps) {
  const features: Feature[] = [
    {
      id: 'chat',
      title: 'Ask HR Bot',
      icon: <MessageSquare className="w-12 h-12" />,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'history',
      title: 'History',
      icon: <History className="w-12 h-12" />,
      gradient: 'from-orange-500 to-red-500',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-12 h-12" />,
      gradient: 'from-green-500 to-emerald-500',
    },
  ];

  if (user.role === 'admin') {
    features.push({
      id: 'admin',
      title: 'Admin Dashboard',
      icon: <Shield className="w-12 h-12" />,
      gradient: 'from-red-600 to-orange-600',
      adminOnly: true,
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-[#0f1724]">
      {/* Fixed height header so layout below can center properly */}
      <div className="h-20">
        <Header
          user={user}
          onProfileClick={onProfileClick}
          onNotificationClick={onNotificationClick}
          onSettingsClick={onSettingsClick}
          unreadCount={unreadCount}
        />
      </div>

      {/* 🚀 TRUE CENTERING SECTION 🚀 */}
      <div
        className="
          flex 
          flex-col 
          justify-center 
          items-center 
          px-6
          text-center
        "
        style={{
          height: 'calc(100vh - 80px)', // header is 80px total
        }}
      >
        <h2 className="text-4xl font-bold text-white mb-4">
          Welcome back, {user.name.split(' ')[0]}
        </h2>

        <p className="text-xl text-slate-300 mb-12">
          What would you like to do today?
        </p>

        {/* Perfectly centered grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 place-items-center">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onFeatureClick(feature.id)}
              className="feature-card group flex flex-col items-center"
            >
              <div
                className={`w-32 h-32 rounded-full bg-blue-500
                  flex items-center justify-center text-white shadow-2xl
                  transform transition-all duration-300
                  group-hover:scale-110 group-hover:shadow-3xl relative overflow-hidden
                `}
              >
                {/* Hover light overlay */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />

                {/* Icon scale animation */}
                <div className="relative z-10 transform group-hover:scale-125 transition-transform duration-300">
                  {feature.icon}
                </div>

                {/* Admin Badge */}
                {feature.adminOnly && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-yellow-900" />
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-lg font-medium text-white group-hover:text-blue-300 transition-colors">
                {feature.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .feature-card {
          animation: fadeInUp 0.6s ease-out backwards;
        }
        .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .feature-card:nth-child(3) { animation-delay: 0.3s; }
        .feature-card:nth-child(4) { animation-delay: 0.4s; }
        .feature-card:nth-child(5) { animation-delay: 0.5s; }
        .feature-card:nth-child(6) { animation-delay: 0.6s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
