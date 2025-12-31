
import { GoogleGenAI, Type } from "@google/genai";
import { CalculatedResult, ExamSummary } from "../types";

export const getAIInsights = async (
  examTitle: string,
  summary: ExamSummary,
  results: CalculatedResult[]
) => {
  // 매 호출마다 새로운 인스턴스를 생성하여 최신 API 키 사용 보장
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    당신은 베테랑 학원 강사입니다. 다음 시험 데이터를 분석하여 한국어로 전문적인 교육 리포트를 작성하세요.
    
    [시험 정보]
    - 시험명: ${examTitle}
    - 응시 인원: ${summary.totalStudents}명
    - 평균 점수: ${summary.average.toFixed(2)}점
    - 최고/최저 점수: ${summary.highestScore}점 / ${summary.lowestScore}점
    - 등급 분포: 1등급(${summary.gradeDistribution[1]}명), 2등급(${summary.gradeDistribution[2]}명), 3등급(${summary.gradeDistribution[3]}명), 4등급(${summary.gradeDistribution[4]}명)

    [요구사항]
    1. 전반적인 성취도 평가를 수행하세요.
    2. 등급별(상위권/중위권/하위권) 맞춤형 학습 조언을 제공하세요.
    3. 향후 수업 방향과 보강이 필요한 개념을 추천하세요.
    4. 선생님이 학부모 상담 시 활용할 수 있는 핵심 코멘트를 포함하세요.
    
    톤앤매너: 전문적이고 신뢰감 있으며 격려하는 어조.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        // 복잡한 분석을 위해 사고 예산 설정 (Gemini 3 Pro)
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });
    return response.text || "분석 결과를 생성하지 못했습니다. 다시 시도해주세요.";
  } catch (error) {
    console.error("Gemini Analytics Error:", error);
    return `AI 분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
  }
};

export const extractScoresFromImage = async (base64Image: string, studentNames: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const prompt = `
    이미지(시험지 또는 성적표)에서 학생의 이름과 점수를 정확히 추출하세요.
    
    [참조 학생 명단]
    ${studentNames.join(', ')}
    
    [규칙]
    1. 명단에 있는 이름과 가장 유사한 이름을 매칭하세요.
    2. 점수는 숫자만 추출하세요 (예: "95점" -> 95).
    3. 명단에 없는 이름이 확연할 경우 무시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              score: { type: Type.NUMBER }
            },
            required: ["name", "score"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("OCR Error:", error);
    return [];
  }
};
