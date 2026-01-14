
import React, { useState } from 'react';
import { SupabaseConfig, Student, Exam } from '../types';

interface SettingsProps {
  config: SupabaseConfig | null;
  onSaveConfig: (config: SupabaseConfig) => void;
  onClearConfig: () => void;
  onPushToCloud: () => Promise<void>;
  localData: { students: Student[], exams: Exam[] };
  isCloudConnected: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  config, 
  onSaveConfig, 
  onClearConfig, 
  onPushToCloud,
  localData,
  isCloudConnected
}) => {
  const [url, setUrl] = useState(config?.url || '');
  const [key, setKey] = useState(config?.anonKey || '');
  const [isPushing, setIsPushing] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const sqlCode = `
-- 1. 학생(students) 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  "createdAt" BIGINT
);

-- 2. 시험(exams) 테이블 생성
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "passThreshold" INTEGER,
  "targetSchools" JSONB,
  scores JSONB NOT NULL
);

-- 3. 실시간(Realtime) 동기화 활성화
-- 이 명령어를 실행해야 한 기기에서 입력 시 다른 기기에서 즉시 새로고침됩니다.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE students, exams;
COMMIT;

-- 4. 보안 정책(RLS) 설정 (모든 접근 허용)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for all" ON students;
DROP POLICY IF EXISTS "Enable access for all" ON exams;

CREATE POLICY "Enable access for all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for all" ON exams FOR ALL USING (true) WITH CHECK (true);
  `.trim();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) {
      alert('URL과 API Key를 모두 입력해주세요.');
      return;
    }
    // URL 끝에 /가 있으면 제거
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    onSaveConfig({ url: cleanUrl, anonKey: key });
    alert('연결 설정이 저장되었습니다. 앱이 새로고침되며 데이터 동기화가 시작됩니다.');
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('SQL 코드가 복사되었습니다! Supabase 웹사이트의 SQL Editor에 붙여넣으세요.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Detailed Guide Section */}
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/40">☁️</div>
            <div>
              <h3 className="text-2xl font-black">멀티 기기 동기화 가이드</h3>
              <p className="text-slate-400 text-sm font-bold">다른 핸드폰이나 컴퓨터에서 점수를 같이 보려면 아래 순서대로 세팅하세요.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="inline-block px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black mb-4">STEP 01</span>
              <p className="font-bold text-base mb-2">DB 테이블 만들기</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Supabase 메뉴 중 <span className="text-white font-bold">SQL Editor</span>(터미널 모양)를 눌러 아래 코드를 복사해 넣고 <span className="text-blue-400 font-bold">Run</span> 하세요.
              </p>
              <button 
                onClick={() => setShowSql(!showSql)}
                className="w-full py-2 bg-white/10 rounded-xl text-xs font-black hover:bg-white/20 transition-all"
              >
                {showSql ? '가이드 닫기' : 'SQL 코드 확인하기'}
              </button>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="inline-block px-3 py-1 bg-green-500 rounded-full text-[10px] font-black mb-4">STEP 02</span>
              <p className="font-bold text-base mb-2">연결 키 가져오기</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                설정(톱니바퀴) → <span className="text-white font-bold">API</span> 메뉴에서 <br/>
                <span className="text-green-400 font-bold">Project URL</span>과 <span className="text-green-400 font-bold">anon key</span>를 복사하세요.
              </p>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="inline-block px-3 py-1 bg-purple-500 rounded-full text-[10px] font-black mb-4">STEP 03</span>
              <p className="font-bold text-base mb-2">모든 기기에 입력</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                동기화할 다른 핸드폰에서도 우리 앱을 켜고, 아래 입력창에 <span className="text-purple-400 font-bold">같은 URL/Key</span>를 넣고 저장하면 끝!
              </p>
            </div>
          </div>

          {showSql && (
            <div className="mt-8 animate-in zoom-in-95 duration-200">
              <div className="bg-black/60 rounded-[2rem] p-6 border border-white/10 relative group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">PostgreSQL Script</span>
                  <button 
                    onClick={() => copyToClipboard(sqlCode)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    전체 복사하기
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto custom-scrollbar max-h-60 p-2">
                  {sqlCode}
                </pre>
              </div>
            </div>
          )}
        </div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      {/* Input Section */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-8">
           <span className="text-2xl">🔗</span>
           <h3 className="text-xl font-black text-slate-800">연결 정보 입력</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supabase Project URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://abc...supabase.co"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-mono text-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anon / Public API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJh..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-mono text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
            >
              설정 저장 및 연결하기
            </button>
            {config && (
              <button
                type="button"
                onClick={() => {
                  if(confirm('정말 연결을 해제하시겠습니까? 연결 해제 시 현재 기기에서만 데이터가 저장됩니다.')) {
                    onClearConfig();
                    window.location.reload();
                  }
                }}
                className="px-10 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-[0.98]"
              >
                연결 해제
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Migration Section */}
      {isCloudConnected && (
        <div className="bg-blue-600 p-10 rounded-[3rem] shadow-xl shadow-blue-200 relative overflow-hidden text-white">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🚀</span>
                <h3 className="text-xl font-black">클라우드 데이터 이전</h3>
              </div>
              <p className="text-blue-100 text-sm font-bold leading-relaxed">
                현재 핸드폰에만 있는 <span className="text-white underline">{localData.students.length}명</span>의 학생 명단과 <span className="text-white underline">{localData.exams.length}건</span>의 시험 정보를 <br/>
                방금 연결한 서버로 모두 전송합니다. <br/>
                <span className="opacity-60 text-xs">* 연결 후 딱 한 번만 하시면 다른 기기에서도 이 데이터가 보입니다.</span>
              </p>
            </div>
            <button
              onClick={async () => {
                if(!confirm('로컬 데이터를 클라우드로 전송하시겠습니까?')) return;
                setIsPushing(true);
                try {
                  await onPushToCloud();
                  alert('성공! 이제 다른 기기에서도 이 데이터를 보실 수 있습니다.');
                } catch(e) {
                  alert('데이터 전송 중 오류가 발생했습니다. SQL 설정을 다시 확인해주세요.');
                } finally {
                  setIsPushing(false);
                }
              }}
              disabled={isPushing || (localData.students.length === 0 && localData.exams.length === 0)}
              className="bg-white text-blue-600 px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-blue-50 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] whitespace-nowrap"
            >
              {isPushing ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  전송 중...
                </div>
              ) : '서버로 데이터 밀어넣기'}
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      )}
    </div>
  );
};

export default Settings;
