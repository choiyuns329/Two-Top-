
import React, { useState, useRef } from 'react';
import { Student, Exam, ScoreEntry } from '../types';
import { calculateExamResults, getExamSummary } from '../utils/gradingUtils';
import { extractScoresFromImage } from '../services/geminiService';

interface ExamManagementProps {
  students: Student[];
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ students, exams, onAddExam, onDeleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passThreshold, setPassThreshold] = useState<number | ''>('');
  const [tempScores, setTempScores] = useState<Record<string, number>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  
  // Camera & OCR states
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCreateExam = () => {
    if (!title.trim() || students.length === 0) return;

    const scores: ScoreEntry[] = Object.entries(tempScores).map(([studentId, score]) => ({
      studentId,
      score: Number(score)
    }));

    const newExam: Exam = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      date: new Date().toISOString(),
      maxScore,
      passThreshold: passThreshold === '' ? undefined : Number(passThreshold),
      scores
    };

    onAddExam(newExam);
    setIsAdding(false);
    setTitle('');
    setPassThreshold('');
    setTempScores({});
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("카메라를 켤 수 없습니다.");
      setIsScanning(false);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    // Stop camera
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsScanning(false);

    // AI Processing
    const studentNames = students.map(s => s.name);
    const extractedData = await extractScoresFromImage(base64Image, studentNames);
    
    const newTempScores = { ...tempScores };
    extractedData.forEach((item: {name: string, score: number}) => {
      const student = students.find(s => s.name === item.name);
      if (student) {
        newTempScores[student.id] = item.score;
      }
    });
    
    setTempScores(newTempScores);
    setIsProcessing(false);
    alert(`${extractedData.length}명의 성적을 성공적으로 인식했습니다!`);
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const results = selectedExam ? calculateExamResults(selectedExam.scores, students, selectedExam.passThreshold) : [];
  const summary = getExamSummary(results);

  return (
    <div className="space-y-8">
      {/* List of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => setIsAdding(true)}
          className="h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
            <span className="text-2xl text-slate-400 group-hover:text-blue-500">+</span>
          </div>
          <span className="font-bold">새 시험 등록 및 채점</span>
        </button>

        {exams.slice().reverse().map((exam) => (
          <div
            key={exam.id}
            onClick={() => setSelectedExamId(exam.id)}
            className={`cursor-pointer p-6 rounded-xl border transition-all ${
              selectedExamId === exam.id ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                {new Date(exam.date).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteExam(exam.id);
                  if (selectedExamId === exam.id) setSelectedExamId(null);
                }}
                className="text-slate-300 hover:text-red-500 p-1"
              >
                ✕
              </button>
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 truncate">{exam.title}</h4>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-slate-500">
                <span className="font-bold text-slate-800">{exam.scores.length}</span>명 응시
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                →
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exam Detail & Results */}
      {selectedExam && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{selectedExam.title}</h3>
                  <p className="text-slate-400 text-sm">성적 통계 및 석차 분석</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[90px] border border-white/10">
                    <p className="text-[10px] text-slate-400 uppercase font-black">Average</p>
                    <p className="text-xl font-black text-blue-400">{summary.average.toFixed(1)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[90px] border border-white/10">
                    <p className="text-[10px] text-slate-400 uppercase font-black">High</p>
                    <p className="text-xl font-black text-green-400">{summary.highestScore}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-8 py-5">Rank</th>
                  <th className="px-8 py-5">Name</th>
                  <th className="px-8 py-5">Score</th>
                  <th className="px-8 py-5">Result</th>
                  <th className="px-8 py-5">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((res) => (
                  <tr key={res.studentId} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <span className={`inline-block w-8 h-8 rounded-lg text-center leading-8 font-black text-sm ${
                        res.rank === 1 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100' : 
                        res.rank === 2 ? 'bg-slate-300 text-white' :
                        res.rank === 3 ? 'bg-orange-300 text-white' : 'text-slate-400 border border-slate-100'
                      }`}>
                        {res.rank}
                      </span>
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-800">{res.name}</td>
                    <td className="px-8 py-4 font-black text-blue-600">{res.score}</td>
                    <td className="px-8 py-4">
                      {res.isPassed !== undefined ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                          res.isPassed ? 'text-blue-500 bg-blue-50' : 'text-red-500 bg-red-50'
                        }`}>
                          {res.isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                        res.grade === 1 ? 'text-green-600 bg-green-50' :
                        res.grade === 2 ? 'text-blue-600 bg-blue-50' :
                        res.grade === 3 ? 'text-yellow-600 bg-yellow-50' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {res.grade}등급
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">성적 입력</h3>
                <p className="text-xs text-slate-500">학생들의 점수를 기록하고 등수를 산출합니다.</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-2">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">시험 제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 3월 모의평가"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">만점</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">통과 기준</label>
                  <input
                    type="number"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="미설정"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">학생별 점수</h4>
                  <button
                    onClick={startCamera}
                    className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    <span>📸</span>
                    <span>AI 카메라 스캔</span>
                  </button>
                </div>

                {isScanning && (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border border-dashed border-white/50 rounded-lg"></div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3">
                      <button
                        onClick={captureAndScan}
                        disabled={isProcessing}
                        className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold shadow-xl hover:bg-slate-100 disabled:opacity-50"
                      >
                        {isProcessing ? "분석 중..." : "촬영 및 데이터 추출"}
                      </button>
                      <button
                        onClick={() => {
                          const stream = videoRef.current?.srcObject as MediaStream;
                          stream?.getTracks().forEach(t => t.stop());
                          setIsScanning(false);
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-xl"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-50 transition-colors">
                      <span className="font-bold text-slate-700">{student.name}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="0"
                          value={tempScores[student.id] ?? ''}
                          onChange={(e) => setTempScores({ ...tempScores, [student.id]: Number(e.target.value) })}
                          className="w-20 px-3 py-2 bg-white border-none rounded-xl text-right focus:ring-2 focus:ring-blue-500 outline-none font-black text-blue-600"
                        />
                        <span className="text-slate-400 text-xs font-bold">/ {maxScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleCreateExam}
                disabled={!title || students.length === 0}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
              >
                Save & Calculate Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
