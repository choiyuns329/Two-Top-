
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import ExamManagement from './components/ExamManagement';
import Analytics from './components/Analytics';
import { ViewMode, Student, Exam } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // LocalStorage Sync
  useEffect(() => {
    const savedStudents = localStorage.getItem('edu_students');
    const savedExams = localStorage.getItem('edu_exams');
    if (savedStudents) setStudents(JSON.parse(savedStudents));
    if (savedExams) setExams(JSON.parse(savedExams));
  }, []);

  useEffect(() => {
    localStorage.setItem('edu_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('edu_exams', JSON.stringify(exams));
  }, [exams]);

  const addStudent = (name: string, school: string, phone: string) => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      school,
      phone,
      createdAt: Date.now(),
    };
    setStudents([...students, newStudent]);
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const deleteStudent = (id: string) => {
    if (window.confirm('정말 이 학생을 삭제하시겠습니까?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  const addExam = (exam: Exam) => {
    setExams([...exams, exam]);
  };

  const deleteExam = (id: string) => {
    if (window.confirm('이 시험 기록을 삭제하시겠습니까?')) {
      setExams(exams.filter(e => e.id !== id));
    }
  };

  const renderContent = () => {
    switch (view) {
      case ViewMode.DASHBOARD:
        return <Dashboard students={students} exams={exams} />;
      case ViewMode.STUDENTS:
        return (
          <StudentManagement 
            students={students} 
            exams={exams}
            onAddStudent={addStudent} 
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent} 
          />
        );
      case ViewMode.EXAMS:
        return (
          <ExamManagement 
            students={students} 
            exams={exams} 
            onAddExam={addExam} 
            onDeleteExam={deleteExam} 
          />
        );
      case ViewMode.ANALYTICS:
        return <Analytics students={students} exams={exams} />;
      default:
        return <Dashboard students={students} exams={exams} />;
    }
  };

  return (
    <Layout activeView={view} setView={setView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
