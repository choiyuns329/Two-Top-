
import React, { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      const savedStudents = localStorage.getItem('students');
      const savedExams = localStorage.getItem('exams');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedExams) setExams(JSON.parse(savedExams));

      if (supabase) {
        try {
          const { data: sRows, error: sErr } = await supabase.from('students').select('*');
          const { data: eRows, error: eErr } = await supabase.from('exams').select('*');
          
          if (!sErr && sRows) setStudents(sRows.map(mapStudentFromDB));
          if (!eErr && eRows) setExams(eRows.map(mapExamFromDB));
        } catch (error) {
          console.warn("Cloud sync failed on init, using local data.");
        }
      }
      setLoading(false);
    };

    initData();

    if (supabase) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStudent = mapStudentFromDB(payload.new);
            setStudents(prev => prev.find(s => s.id === newStudent.id) ? prev : [...prev, newStudent]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapStudentFromDB(payload.new);
            setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
          } else if (payload.eventType === 'DELETE') {
            setStudents(prev => prev.filter(s => s.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updated = mapExamFromDB(payload.new);
            setExams(prev => {
              const idx = prev.findIndex(e => e.id === updated.id);
              if (idx > -1) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
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
    if (!loading) {
      localStorage.setItem('students', JSON.stringify(students));
      localStorage.setItem('exams', JSON.stringify(exams));
    }
  }, [students, exams, loading]);

  const addStudent = async (name: string, school: string, phone: string) => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      school,
      phone,
      createdAt: Date.now(),
    };
    setStudents(prev => [...prev, newStudent]);

    if (supabase) {
      try {
        const { error } = await supabase.from('students').insert([mapStudentToDB(newStudent)]);
        if (error) console.error("Cloud insert error:", error);
      } catch (e) { console.error(e); }
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (supabase) {
      try {
        await supabase.from('students').update(mapStudentToDB(updatedStudent)).eq('id', updatedStudent.id);
      } catch (e) { console.error(e); }
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setStudents(prev => prev.filter(s => s.id !== id));
    if (supabase) {
      try {
        await supabase.from('students').delete().eq('id', id);
      } catch (e) { console.error(e); }
    }
  };

  const addExam = async (exam: Exam) => {
    // 1. 로컬 저장
    setExams(prev => [...prev, exam]);

    // 2. 클라우드 저장 (매핑 후 전송)
    if (supabase) {
      try {
        const dbData = mapExamToDB(exam);
        const { error } = await supabase.from('exams').insert([dbData]);
        if (error) {
          console.error("Cloud Exam Insert Error Detail:", error);
          // 에러 객체를 문자열화하여 더 자세히 알림
          const errorMsg = `Code: ${error.code}\nMessage: ${error.message}\nDetail: ${error.details || 'No detail'}`;
          
          if (error.code === '42P01') {
            alert("서버에 시험 테이블이 없습니다. '동기화 설정' 페이지에서 SQL 코드를 다시 실행하세요.");
          } else if (error.code === '42703') {
            alert("서버 테이블 구조가 구버전입니다. '동기화 설정'의 SQL 코드 상단 주석(DROP TABLE)을 참고해 테이블을 재설정하세요.");
          } else {
            alert(`클라우드 저장 실패:\n${errorMsg}\n\n(로컬에는 임시 저장되었습니다.)`);
          }
        }
      } catch (e: any) {
        console.error("Network or Unexpected Error:", e);
        alert(`네트워크 오류가 발생했습니다: ${e.message}`);
      }
    }
  };

  const updateExam = async (updatedExam: Exam) => {
    setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
    if (supabase) {
      try {
        await supabase.from('exams').update(mapExamToDB(updatedExam)).eq('id', updatedExam.id);
      } catch (e) { console.error(e); }
    }
  };

  const deleteExam = async (id: string) => {
    if (!window.confirm('시험 기록을 삭제하시겠습니까?')) return;
    setExams(prev => prev.filter(e => e.id !== id));
    if (supabase) {
      try {
        await supabase.from('exams').delete().eq('id', id);
      } catch (e) { console.error(e); }
    }
  };

  const pushToCloud = async () => {
    if (!supabase) return;
    const localStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    const localExams: Exam[] = JSON.parse(localStorage.getItem('exams') || '[]');
    
    if (localStudents.length > 0) {
      const { error } = await supabase.from('students').upsert(localStudents.map(mapStudentToDB));
      if (error) throw error;
    }
    if (localExams.length > 0) {
      const { error } = await supabase.from('exams').upsert(localExams.map(mapExamToDB));
      if (error) throw error;
    }

    const { data: sRows } = await supabase.from('students').select('*');
    const { data: eRows } = await supabase.from('exams').select('*');
    if (sRows) setStudents(sRows.map(mapStudentFromDB));
    if (eRows) setExams(eRows.map(mapExamFromDB));
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-xs">Preparing Workspace...</p>
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
          localData={{
            students: JSON.parse(localStorage.getItem('students') || '[]'),
            exams: JSON.parse(localStorage.getItem('exams') || '[]')
          }}
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
