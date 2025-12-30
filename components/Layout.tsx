
import React from 'react';
import { ViewMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewMode;
  setView: (view: ViewMode) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView }) => {
  const navItems = [
    { id: ViewMode.DASHBOARD, label: '대시보드', icon: '📊' },
    { id: ViewMode.STUDENTS, label: '학생 관리', icon: '👥' },
    { id: ViewMode.EXAMS, label: '시험 및 채점', icon: '📝' },
    { id: ViewMode.ANALYTICS, label: '심층 분석', icon: '💡' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">EduManager</h1>
          <p className="text-xs text-slate-400 mt-1">Smart Academy Admin</p>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {navItems.find(n => n.id === activeView)?.label}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-500">환영합니다, 관리자님</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
