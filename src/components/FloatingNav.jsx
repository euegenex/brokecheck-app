import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Target, Settings } from 'lucide-react';

function FloatingNav() {
  const location = useLocation();
  
  // Helper to determine if the icon should be highlighted
  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-full px-6 py-4 flex justify-between items-center z-50">
      <Link to="/" className={`transition-all duration-300 ${isActive('/') ? 'text-slate-900 scale-110 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        <Home className="w-6 h-6" strokeWidth={isActive('/') ? 2.5 : 2} />
      </Link>
      <Link to="/analytics" className={`transition-all duration-300 ${isActive('/analytics') ? 'text-slate-900 scale-110 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        <BarChart2 className="w-6 h-6" strokeWidth={isActive('/analytics') ? 2.5 : 2} />
      </Link>
      <Link to="/streak" className={`transition-all duration-300 ${isActive('/streak') ? 'text-slate-900 scale-110 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        <Target className="w-6 h-6" strokeWidth={isActive('/streak') ? 2.5 : 2} />
      </Link>
      <Link to="/settings" className={`transition-all duration-300 ${isActive('/settings') ? 'text-slate-900 scale-110 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        <Settings className="w-6 h-6" strokeWidth={isActive('/settings') ? 2.5 : 2} />
      </Link>
    </div>
  );
}

export default FloatingNav;