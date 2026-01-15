
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
-- ⚠️ 주의: 이 코드는 기존 데이터를 모두 지우고 테이블을 새로 만듭니다.
-- 1. 기존 테이블 삭제
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;

-- 2. 학생(students) 테이블 생성
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  created_at BIGINT
);

-- 3. 시험(exams) 테이블 생성
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

-- 5. 보안 정책(RLS) 해제
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON exams FOR ALL USING (true) WITH CHECK (true);

-- 6. 서버 캐시 새로고침
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
    alert('SQL 코드가 복사되었습니다!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Troubleshooting Alert */}
      <div className="bg-amber-500 text-white p-8 rounded-[2.5rem] shadow-lg">
        <h4 className="text-lg font-black mb-2">💡 "Unknown" 학생 이름이 뜨나요?</h4>
        <p className="text-sm font-bold opacity-90 leading-relaxed">
          다른 기기에서 학생 이름이 'Unknown'으로 보인다면, <br/>
          원래 기기에서 아래 <span className="bg-white/20 px-1 rounded">데이터 최종 업로드</span> 버튼을 한 번 더 눌러주세요. <br/>
          학생 정보가 서버에 완전히 올라가지 않았을 때 발생하는 현상입니다.
        </p>
      </div>

      <div className="bg-red-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center text-2xl font-black">!</div>
            <div>
              <h3 className="text-2xl font-black">DB 구조 재설정 (PGRST204 해결)</h3>
              <p className="text-red-100 text-sm font-bold opacity-90">데이터 저장이 안 될 경우에만 아래 SQL을 다시 실행하세요.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSql(!showSql)}
            className="bg-white text-red-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-red-50 transition-all"
          >
            {showSql ? '가이드 닫기' : '최신 SQL 코드 보기'}
          </button>

          {showSql && (
            <div className="mt-6 bg-black/40 rounded-3xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-200">DB Schema Script</span>
                <button onClick={() => copyToClipboard(sqlCode)} className="bg-white text-red-600 px-4 py-2 rounded-lg text-xs font-black">복사</button>
              </div>
              <pre className="text-[11px] font-mono text-red-100 overflow-x-auto max-h-60">{sqlCode}</pre>
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
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg">설정 저장</button>
        </form>
      </div>

      {isCloudConnected && (
        <div className="bg-blue-600 p-10 rounded-[3rem] shadow-xl text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-black mb-2">데이터 최종 업로드</h3>
              <p className="text-blue-100 text-sm font-bold">학생 명단과 시험 기록을 서버로 모두 강제 전송합니다. (Unknown 이름 해결법)</p>
            </div>
            <button
              onClick={async () => {
                setIsPushing(true);
                try {
                  await onPushToCloud();
                  alert('모든 데이터가 성공적으로 서버에 동기화되었습니다!');
                } catch(e: any) {
                  alert(`전송 실패: ${e.message}`);
                } finally { setIsPushing(false); }
              }}
              disabled={isPushing}
              className="bg-white text-blue-600 px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              {isPushing ? '전송 중...' : '데이터 전체 전송'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
