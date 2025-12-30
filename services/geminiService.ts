
import { GoogleGenAI } from "@google/genai";
import { CalculatedResult, ExamSummary } from "../types";

export const getAIInsights = async (
  examTitle: string,
  summary: ExamSummary,
  results: CalculatedResult[]
) => {
  // Use process.env.API_KEY directly as per @google/genai guidelines.
  // The API key is assumed to be pre-configured and accessible.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    다음은 학원 시험 결과 데이터입니다.
    시험명: ${examTitle}
    응시 인원: ${summary.totalStudents}명
    평균 점수: ${summary.average.toFixed(2)}점
    최고 점수: ${summary.highestScore}점
    최저 점수: ${summary.lowestScore}점
    등급 분포: 1등급(${summary.gradeDistribution[1]}명), 2등급(${summary.gradeDistribution[2]}명), 3등급(${summary.gradeDistribution[3]}명), 4등급(${summary.gradeDistribution[4]}명)

    이 데이터를 바탕으로 선생님(학원 알바생)이 학생들을 어떻게 지도하면 좋을지 짧고 명확한 분석 리포트를 한국어로 작성해줘. 
    다음 내용을 포함해줘:
    1. 전체적인 학습 성취도 평가
    2. 하위권(4등급) 학생들을 위한 격려와 지도 조언
    3. 다음 시험을 위한 학습 방향 제언
    4. 특이사항 분석 (예: 평균이 낮을 때의 대처 등)
  `;

  try {
    // Upgraded to gemini-3-pro-preview for complex reasoning task (pedagogical analysis).
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    // Use .text property directly as per @google/genai SDK instructions.
    return response.text || "분석 결과를 가져오지 못했습니다.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 분석 중 오류가 발생했습니다.";
  }
};
