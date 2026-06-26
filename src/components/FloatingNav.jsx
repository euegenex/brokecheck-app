import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, TrendingUp, Settings } from 'lucide-react';

function FloatingNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const tabs = [
    { path: '/',         Icon: Home,       label: 'Home' },
    { path: '/analytics', Icon: BarChart2,  label: 'Analytics' },
    { path: '/invest',   Icon: TrendingUp,  label: 'Invest' },
    { path: '/settings', Icon: Settings,    label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-full px-6 py-4 flex justify-between items-center z-50">
      {tabs.map(({ path, Icon, label }) => (
        <Link key={path} to={path}
          className={`flex flex-col items-center space-y-0.5 transition-all duration-300 ${isActive(path) ? 'text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
          <Icon className="w-6 h-6" strokeWidth={isActive(path) ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${isActive(path) ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
        </Link>
      ))}
    </div>
  );
}

export default FloatingNav;