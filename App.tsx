
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import StudentManagement from './components/StudentManagement.tsx';
import StudentDetailView from './components/StudentDetailView.tsx';
import ExamManagement from './components/ExamManagement.tsx';
import Analytics from './components/Analytics.tsx';
import Settings from './components/Settings.tsx';
import { ViewMode, Student, Exam, SupabaseConfig } from './types.ts';
import { createClient } from '@supabase/supabase-js';

// Supabase DB 필드와 앱 모델 간의 변환 유틸리티
const mapStudentToDB = (s: Student) => ({
  id: s.id,
  name: s.name,
  school: s.school,
  phone: s.phone,
  note: s.note,
  created_at: s.createdAt
});

const mapStudentFromDB = (row: any): Student => ({
  id: row.id,
  name: row.name,
  school: row.school,
  phone: row.phone,
  note: row.note,
  createdAt: row.created_at
});

const mapExamToDB = (e: Exam) => ({
  id: e.id,
  title: e.title,
  date: e.date,
  type: e.type,
  total_questions: e.totalQuestions,
  max_score: e.maxScore,
  pass_threshold: e.passThreshold,
  question_points: e.questionPoints,
  target_schools: e.targetSchools,
  scores: e.scores
});

const mapExamFromDB = (row: any): Exam => ({
  id: row.id,
  title: row.title,
  date: row.date,
  type: row.type,
  totalQuestions: row.total_questions,
  maxScore: row.max_score,
  passThreshold: row.pass_threshold,
  questionPoints: row.question_points,
  targetSchools: row.target_schools,
  scores: row.scores
});

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  const [sbConfig, setSbConfig] = useState<SupabaseConfig | null>(() => {
    const saved = localStorage.getItem('supabase_config');
    return saved ? JSON.parse(saved) : null;
  });

  const supabase = useMemo(() => {
    if (sbConfig?.url && sbConfig?.anonKey) {
      try {
        return createClient(sbConfig.url, sbConfig.anonKey);
      } catch (e) {
        console.error("Supabase client init error:", e);
        return null;
      }
    }
    return null;
  }, [sbConfig]);

  // 데이터 로드 및 병합 로직
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      let localStudents: Student[] = [];
      let localExams: Exam[] = [];
      try {
        const s = localStorage.getItem('students');
        const e = localStorage.getItem('exams');
        if (s) localStudents = JSON.parse(s);
        if (e) localExams = JSON.parse(e);
      } catch (err) {
        console.error("Local storage parse error:", err);
      }

      setStudents(localStudents);
      setExams(localExams);

      if (supabase) {
        try {
          const { data: sRows, error: sErr } = await supabase.from('students').select('*');
          const { data: eRows, error: eErr } = await supabase.from('exams').select('*');
          
          if (!sErr && sRows) {
            const cloudStudents = sRows.map(mapStudentFromDB);
            setStudents(prev => {
              const merged = [...prev];
              cloudStudents.forEach(cs => {
                const idx = merged.findIndex(ps => ps.id === cs.id);
                if (idx > -1) merged[idx] = cs;
                else merged.push(cs);
              });
              return merged;
            });
          }
          
          if (!eErr && eRows) {
            const cloudExams = eRows.map(mapExamFromDB);
            setExams(prev => {
              const merged = [...prev];
              cloudExams.forEach(ce => {
                const idx = merged.findIndex(pe => ce.id === pe.id);
                if (idx > -1) merged[idx] = ce;
                else merged.push(ce);
              });
              return merged;
            });
          }
        } catch (error) {
          console.warn("Cloud sync initial failed");
        }
      }
      
      setLoading(false);
      isInitialized.current = true;
    };

    initData();

    if (supabase) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (!isInitialized.current) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = mapStudentFromDB(payload.new);
            setStudents(prev => {
              const idx = prev.findIndex(s => s.id === row.id);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = row;
                return next;
              }
              return [...prev, row];
            });
          } else if (payload.eventType === 'DELETE') {
            setStudents(prev => prev.filter(s => s.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
          if (!isInitialized.current) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = mapExamFromDB(payload.new);
            setExams(prev => {
              const idx = prev.findIndex(e => e.id === row.id);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = row;
                return next;
              }
              return [...prev, row];
            });
          } else if (payload.eventType === 'DELETE') {
            setExams(prev => prev.filter(e => e.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [supabase]);

  useEffect(() => {
    if (!loading && isInitialized.current) {
      localStorage.setItem('students', JSON.stringify(students));
      localStorage.setItem('exams', JSON.stringify(exams));
    }
  }, [students, exams, loading]);

  const addStudent = async (name: string, school: string, phone: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newStudent: Student = {
      id: newId,
      name, school, phone, createdAt: Date.now(),
    };
    setStudents(prev => [...prev, newStudent]);

    if (supabase) {
      try { 
        const { error } = await supabase.from('students').insert([mapStudentToDB(newStudent)]); 
        if (error) {
          console.error("Student Insert Error:", error);
          alert(`학생 서버 저장 실패: ${error.message}\n(기존 기기에서 '데이터 최종 업로드'를 실행하면 해결됩니다.)`);
        }
      } catch (e: any) {
        console.error("Network Error:", e);
      }
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (supabase) {
      try { 
        const { error } = await supabase.from('students').update(mapStudentToDB(updatedStudent)).eq('id', updatedStudent.id); 
        if (error) alert(`학생 수정 서버 동기화 실패: ${error.message}`);
      } catch (e) {}
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setStudents(prev => prev.filter(s => s.id !== id));
    if (supabase) {
      try { 
        const { error } = await supabase.from('students').delete().eq('id', id); 
        if (error) alert(`학생 삭제 서버 동기화 실패: ${error.message}`);
      } catch (e) {}
    }
  };

  const addExam = async (exam: Exam) => {
    setExams(prev => [...prev, exam]);
    if (supabase) {
      try {
        const dbData = mapExamToDB(exam);
        const { error } = await supabase.from('exams').insert([dbData]);
        if (error) {
          console.error("Supabase Error:", error);
          if (error.code === 'PGRST204' || error.message.includes('column')) {
            alert("⚠️ 서버 테이블 구조가 다릅니다!\n\n[동기화 설정] 메뉴에서 새로운 SQL 코드를 실행하셔야 'Unknown' 문제를 방지할 수 있습니다.");
          } else {
            alert(`시험 서버 저장 실패: ${error.message}`);
          }
        }
      } catch (e: any) {
        console.error("Sync Error:", e);
      }
    }
  };

  const updateExam = async (updatedExam: Exam) => {
    setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
    if (supabase) {
      try { await supabase.from('exams').update(mapExamToDB(updatedExam)).eq('id', updatedExam.id); } catch (e) {}
    }
  };

  const deleteExam = async (id: string) => {
    if (!window.confirm('시험 기록을 삭제하시겠습니까?')) return;
    setExams(prev => prev.filter(e => e.id !== id));
    if (supabase) {
      try { await supabase.from('exams').delete().eq('id', id); } catch (e) {}
    }
  };

  const pushToCloud = async () => {
    if (!supabase) return;
    const localStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    const localExams: Exam[] = JSON.parse(localStorage.getItem('exams') || '[]');
    
    // 학생 먼저 전송 (Referential Integrity)
    if (localStudents.length > 0) {
      const { error } = await supabase.from('students').upsert(localStudents.map(mapStudentToDB));
      if (error) throw new Error(`학생 전송 실패: ${error.message}`);
    }
    
    // 그 다음 시험 전송
    if (localExams.length > 0) {
      const { error } = await supabase.from('exams').upsert(localExams.map(mapExamToDB));
      if (error) throw new Error(`시험 전송 실패: ${error.message}`);
    }

    // 최신 데이터 다시 불러오기
    const { data: sRows } = await supabase.from('students').select('*');
    const { data: eRows } = await supabase.from('exams').select('*');
    if (sRows) setStudents(sRows.map(mapStudentFromDB));
    if (eRows) setExams(eRows.map(mapExamFromDB));
  };

  const renderContent = () => {
    if (loading && !isInitialized.current) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black animate-pulse text-xs">Syncing Cloud...</p>
      </div>
    );

    switch (view) {
      case ViewMode.DASHBOARD: return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS: return <StudentManagement students={students} exams={exams} onAddStudent={addStudent} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent} />;
      case ViewMode.STUDENT_DETAIL: return <StudentDetailView students={students} exams={exams} />;
      case ViewMode.EXAMS: return <ExamManagement students={students} exams={exams} onAddExam={addExam} onUpdateExam={updateExam} onDeleteExam={deleteExam} />;
      case ViewMode.ANALYTICS: return <Analytics students={students} exams={exams} />;
      case ViewMode.SETTINGS: return (
        <Settings 
          config={sbConfig} 
          onSaveConfig={(c) => { localStorage.setItem('supabase_config', JSON.stringify(c)); setSbConfig(c); }}
          onClearConfig={() => { localStorage.removeItem('supabase_config'); setSbConfig(null); }}
          onPushToCloud={pushToCloud}
          localData={{ students, exams }}
          isCloudConnected={!!supabase}
        />
      );
      default: return <Dashboard students={students} exams={exams} />;
    }
  };

  return (
    <Layout activeView={view} setView={setView} isCloudConnected={!!supabase}>
      {renderContent()}
    </Layout>
  );
};

export default App;
