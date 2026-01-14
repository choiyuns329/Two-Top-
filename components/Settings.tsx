
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

  // Postgres 표준인 snake_case를 사용하여 호환성 극대화
  const sqlCode = `
-- [필독] 저장 실패 시 아래 2줄의 주석(--)을 지우고 실행하여 초기화하세요.
-- DROP TABLE IF EXISTS exams;
-- DROP TABLE IF EXISTS students;

-- 1. 학생(students) 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  created_at BIGINT
);

-- 2. 시험(exams) 테이블 생성
CREATE TABLE IF NOT EXISTS exams (
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

-- 3. 실시간(Realtime) 동기화 활성화
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE students, exams;
COMMIT;

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
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    onSaveConfig({ url: cleanUrl, anonKey: key });
    alert('설정이 저장되었습니다. 앱이 새로고침됩니다.');
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('SQL 코드가 복사되었습니다! Supabase SQL Editor에 붙여넣고 Run을 누르세요.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/40">☁️</div>
            <div>
              <h3 className="text-2xl font-black">클라우드 동기화 가이드 (v2.1)</h3>
              <p className="text-slate-400 text-sm font-bold">저장 실패 에러가 발생한다면 반드시 아래 코드로 테이블을 재생성하세요.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <span className="inline-block px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black mb-4">STEP 01</span>
              <p className="font-bold text-base mb-2">DB 초기화 실행</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                SQL Editor에서 코드를 붙여넣기 전, 기존 테이블이 있다면 <span className="text-red-400 font-bold">DROP TABLE</span> 구문을 먼저 실행하는 것이 안전합니다.
              </p>
              <button onClick={() => setShowSql(!showSql)} className="w-full py-2 bg-white/10 rounded-xl text-xs font-black hover:bg-white/20 transition-all">
                {showSql ? '닫기' : 'SQL 코드 보기'}
              </button>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <span className="inline-block px-3 py-1 bg-green-500 rounded-full text-[10px] font-black mb-4">STEP 02</span>
              <p className="font-bold text-base mb-2">Realtime 확인</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                테이블 생성 후 앱을 새로고침하면 왼쪽 하단에 <span className="text-green-400 font-bold">CONNECTED</span> 표시가 떠야 합니다.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <span className="inline-block px-3 py-1 bg-purple-500 rounded-full text-[10px] font-black mb-4">STEP 03</span>
              <p className="font-bold text-base mb-2">데이터 업로드</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                설정이 완료되면 하단의 <span className="text-purple-400 font-bold">데이터 업로드</span> 버튼을 눌러 로컬 데이터를 서버로 보냅니다.
              </p>
            </div>
          </div>

          {showSql && (
            <div className="mt-8 animate-in zoom-in-95 duration-200">
              <div className="bg-black/60 rounded-[2rem] p-6 border border-white/10 relative">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">PostgreSQL Script</span>
                  <button onClick={() => copyToClipboard(sqlCode)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-500 transition-all">전체 복사</button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60 p-2">{sqlCode}</pre>
              </div>
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
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl">저장 및 연결</button>
            {config && <button type="button" onClick={onClearConfig} className="px-10 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black hover:bg-red-50 hover:text-red-500 transition-all">연결 해제</button>}
          </div>
        </form>
      </div>

      {isCloudConnected && (
        <div className="bg-blue-600 p-10 rounded-[3rem] shadow-xl text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-black mb-2">로컬 데이터를 서버로 전송</h3>
              <p className="text-blue-100 text-sm font-bold">현재 기기에만 있는 {localData.students.length}명의 학생과 {localData.exams.length}개의 시험 기록을 서버에 동기화합니다.</p>
            </div>
            <button
              onClick={async () => {
                if(!confirm('데이터를 전송하시겠습니까?')) return;
                setIsPushing(true);
                try {
                  await onPushToCloud();
                  alert('데이터 업로드 성공!');
                } catch(e: any) {
                  console.error(e);
                  alert(`업로드 실패: ${e.message || 'SQL 설정을 확인하세요.'}`);
                } finally { setIsPushing(false); }
              }}
              disabled={isPushing}
              className="bg-white text-blue-600 px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              {isPushing ? '업로드 중...' : '데이터 업로드'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
