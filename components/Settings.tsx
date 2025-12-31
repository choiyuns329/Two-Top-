
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
-- 1. 학생 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  "createdAt" BIGINT
);

-- 2. 시험 테이블 생성 (targetSchools 필드 추가)
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "passThreshold" INTEGER,
  "targetSchools" JSONB,
  scores JSONB NOT NULL
);

-- 3. 실시간 동기화 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE students, exams;

-- 4. 보안 정책(RLS) 설정
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
    onSaveConfig({ url, anonKey: key });
    alert('연결 설정이 저장되었습니다. 잠시 후 데이터 동기화를 시작합니다.');
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('SQL 코드가 복사되었습니다! Supabase의 SQL Editor에 붙여넣으세요.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Step by Step Guide */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-6 flex items-center">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">!</span>
            기기 간 데이터 공유 가이드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
              <p className="text-blue-400 font-black text-xs mb-2 uppercase tracking-widest">Step 01</p>
              <p className="font-bold text-sm mb-2">Supabase 프로젝트 생성</p>
              <p className="text-xs text-slate-400">supabase.com 가입 후 무료 프로젝트를 만드세요.</p>
            </div>
            <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
              <p className="text-blue-400 font-black text-xs mb-2 uppercase tracking-widest">Step 02</p>
              <p className="font-bold text-sm mb-2">데이터 테이블 및 정책 세팅</p>
              <button 
                onClick={() => setShowSql(!showSql)}
                className="text-[10px] bg-white/20 px-2 py-1 rounded font-black hover:bg-white/30 transition-colors"
              >
                {showSql ? 'SQL 코드 닫기' : 'SQL 코드 보기'}
              </button>
            </div>
            <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
              <p className="text-blue-400 font-black text-xs mb-2 uppercase tracking-widest">Step 03</p>
              <p className="font-bold text-sm mb-2">API 키 입력 및 연결</p>
              <p className="text-xs text-slate-400">Project Settings의 URL과 Anon Key를 아래 입력하세요.</p>
            </div>
          </div>

          {showSql && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2">
              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-blue-300 relative">
                <button 
                  onClick={() => copyToClipboard(sqlCode)}
                  className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-500"
                >
                  COPY SQL
                </button>
                <pre className="overflow-x-auto">{sqlCode}</pre>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 italic">* Supabase 왼쪽 메뉴의 &apos;SQL Editor&apos; &rarr; &apos;New Query&apos;에 붙여넣고 &apos;Run&apos;을 누르세요.</p>
            </div>
          )}
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center text-slate-800">
          <span className="mr-3">🔑</span> API 연결 설정
        </h3>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Supabase Project URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-id.supabase.co"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Anon / Public API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="공개 API 키를 입력하세요"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              설정 저장 및 연결
            </button>
            {config && (
              <button
                type="button"
                onClick={() => {
                  if(confirm('연결을 해제하시겠습니까? 데이터는 현재 기기에만 저장됩니다.')) {
                    onClearConfig();
                    window.location.reload();
                  }
                }}
                className="px-8 py-4 border border-slate-200 text-slate-400 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
              >
                연결 해제
              </button>
            )}
          </div>
        </form>
      </div>

      {isCloudConnected && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1 rounded-3xl shadow-xl">
          <div className="bg-white p-8 rounded-[22px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                  <span className="mr-3 text-2xl">📦</span> 기존 데이터 업로드
                </h3>
                <p className="text-slate-500 text-sm">
                  현재 브라우저에 저장된 <strong>{localData.students.length}명</strong>의 학생과 <strong>{localData.exams.length}건</strong>의 시험 기록을<br/>
                  연결된 클라우드 서버로 복사합니다. 처음 한 번만 수행하세요.
                </p>
              </div>
              <button
                onClick={async () => {
                  setIsPushing(true);
                  await onPushToCloud();
                  setIsPushing(false);
                  alert('모든 데이터가 클라우드로 안전하게 이전되었습니다.');
                }}
                disabled={isPushing || (localData.students.length === 0 && localData.exams.length === 0)}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 whitespace-nowrap"
              >
                {isPushing ? '데이터 전송 중...' : '클라우드로 데이터 밀어넣기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
