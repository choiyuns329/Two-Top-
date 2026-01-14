
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

  // PGRST204 에러(Column not found)를 해결하기 위한 완전 초기화 스크립트
  const sqlCode = `
-- ⚠️ 주의: 이 코드는 기존 데이터를 모두 지우고 테이블을 새로 만듭니다.
-- 1. 기존 테이블 삭제 (구조 불일치 해결)
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;

-- 2. 학생(students) 테이블 생성 (snake_case)
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  created_at BIGINT
);

-- 3. 시험(exams) 테이블 생성 (snake_case)
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  pass_threshold INTEGER,
  question_points JSONB,
  target_schools JSONB,
  scores JSONB NOT NULL
);

-- 4. 실시간 동기화 설정
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE students, exams;
COMMIT;

-- 5. 보안 정책(RLS) 해제 (테스트 및 쉬운 설정을 위해 모든 접근 허용)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON exams FOR ALL USING (true) WITH CHECK (true);

-- 6. [중요] 서버 캐시 강제 새로고침 (PGRST204 에러 해결 핵심)
NOTIFY pgrst, 'reload schema';
  `.trim();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) {
      alert('URL과 API Key를 입력하세요.');
      return;
    }
    onSaveConfig({ url: url.trim(), anonKey: key.trim() });
    alert('설정이 저장되었습니다. 앱을 새로고침합니다.');
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('최신 SQL 코드가 복사되었습니다! Supabase SQL Editor에서 실행하세요.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Critical Fix Guide */}
      <div className="bg-red-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">!</div>
            <div>
              <h3 className="text-2xl font-black">PGRST204 에러 긴급 해결법</h3>
              <p className="text-red-100 text-sm font-bold opacity-90">'max_score' 컬럼을 찾을 수 없다는 에러는 DB 구조가 옛날 방식이기 때문입니다.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm leading-relaxed font-bold">
              1. 아래 [최신 SQL 코드 보기] 버튼을 누르세요.<br/>
              2. 코드를 전체 복사하여 Supabase 웹사이트의 <span className="underline">SQL Editor</span>에 붙여넣으세요.<br/>
              3. <span className="bg-white text-red-600 px-2 py-0.5 rounded">Run</span> 버튼을 눌러 실행한 후, 앱을 새로고침하세요.
            </p>
            <button 
              onClick={() => setShowSql(!showSql)}
              className="bg-white text-red-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-red-50 transition-all"
            >
              {showSql ? '가이드 닫기' : '최신 SQL 코드 보기 (에러 해결용)'}
            </button>
          </div>

          {showSql && (
            <div className="mt-6 bg-black/40 rounded-3xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-200">New Schema Script (v2.2)</span>
                <button onClick={() => copyToClipboard(sqlCode)} className="bg-white text-red-600 px-4 py-2 rounded-lg text-xs font-black">코드 전체 복사</button>
              </div>
              <pre className="text-[11px] font-mono text-red-100 overflow-x-auto max-h-60 custom-scrollbar">{sqlCode}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project URL</label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anon API Key</label>
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-mono text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl">설정 업데이트</button>
        </form>
      </div>

      {isCloudConnected && (
        <div className="bg-blue-600 p-10 rounded-[3rem] shadow-xl text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-black mb-2">DB 재설정 후 데이터 다시 보내기</h3>
              <p className="text-blue-100 text-sm font-bold">SQL을 실행하면 서버 데이터가 비워집니다. 이 버튼을 눌러 내 폰의 데이터를 다시 서버로 올리세요.</p>
            </div>
            <button
              onClick={async () => {
                setIsPushing(true);
                try {
                  await onPushToCloud();
                  alert('데이터가 성공적으로 서버에 동기화되었습니다!');
                } catch(e: any) {
                  alert(`전송 실패: ${e.message}`);
                } finally { setIsPushing(false); }
              }}
              disabled={isPushing}
              className="bg-white text-blue-600 px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              {isPushing ? '전송 중...' : '데이터 최종 업로드'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
