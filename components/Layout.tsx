
import React from 'react';
import { ViewMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewMode;
  setView: (view: ViewMode) => void;
  isCloudConnected: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, isCloudConnected }) => {
  const navItems = [
    { id: ViewMode.DASHBOARD, label: '통', icon: '📊' },
    { id: ViewMode.STUDENTS, label: '학생 명단', icon: '👥' },
    { id: ViewMode.STUDENT_DETAIL, label: '학생 개별 관리', icon: '👤' }, // 추가
    { id: ViewMode.EXAMS, label: '시험 및 채점', icon: '📝' },
    { id: ViewMode.ANALYTICS, label: '심층 분석', icon: '💡' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-black text-white italic">T</div>
            <h1 className="text-xl font-black tracking-tighter text-white">TwoTop Manager</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Exam Big Data</p>
        </div>
        
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                activeView === item.id
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Bottom */}
        <div className="p-6 border-t border-slate-800 space-y-4">
          <button
            onClick={() => setView(ViewMode.SETTINGS)}
            className={`w-full flex items-center space-x-3 px-5 py-3 rounded-xl transition-all ${
              activeView === ViewMode.SETTINGS
                ? 'bg-slate-800 text-white ring-1 ring-slate-700'
                : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span className="text-sm font-bold">동기화 설정</span>
          </button>
          
          <div className={`p-4 rounded-2xl border transition-all duration-500 ${
            isCloudConnected ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cloud Sync</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-blue-400 animate-ping' : 'bg-amber-500'}`}></div>
            </div>
            <p className={`text-[11px] font-black ${isCloudConnected ? 'text-blue-400' : 'text-slate-400'}`}>
              {isCloudConnected ? 'CONNECTED' : 'LOCAL ONLY'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {activeView === ViewMode.SETTINGS ? 'Settings & Cloud' : navItems.find(n => n.id === activeView)?.label}
          </h2>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사람을 바꾸는 학원</p>
               <p className="text-sm font-bold text-slate-800">장현우 투탑영어학원</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shadow-lg">
               T
             </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
