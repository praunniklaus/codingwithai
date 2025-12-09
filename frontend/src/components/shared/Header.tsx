import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, LayoutDashboard, FileText, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, resetOnboarding } = useStore();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your profile? This will clear all your data and restart the onboarding process.')) {
      resetOnboarding();
      navigate('/onboarding');
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/applications', label: 'Applications', icon: FileText },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary-500" />
            <span className="text-xl font-bold text-gray-900">Job Assistant</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    active
                      ? 'text-primary-500 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary-50 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Avatar & Reset */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              title="Reset onboarding"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {userProfile?.name || 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {userProfile?.targetRoles?.[0] || 'Job Seeker'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
              {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

