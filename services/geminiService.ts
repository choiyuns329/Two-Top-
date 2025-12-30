
import { GoogleGenAI, Type } from "@google/genai";
import { CalculatedResult, ExamSummary } from "../types";

export const getAIInsights = async (
  examTitle: string,
  summary: ExamSummary,
  results: CalculatedResult[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    다음은 학원 시험 결과 데이터입니다.
    시험명: ${examTitle}
    응시 인원: ${summary.totalStudents}명
    평균 점수: ${summary.average.toFixed(2)}점
    등급 분포: 1등급(${summary.gradeDistribution[1]}명), 2등급(${summary.gradeDistribution[2]}명), 3등급(${summary.gradeDistribution[3]}명), 4등급(${summary.gradeDistribution[4]}명)

    이 데이터를 바탕으로 선생님이 학생들을 어떻게 지도하면 좋을지 짧고 명확한 분석 리포트를 한국어로 작성해줘. 
    내용: 성취도 평가, 하위권 지도 조언, 향후 학습 방향.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    });
    return response.text || "분석 결과를 가져오지 못했습니다.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 분석 중 오류가 발생했습니다.";
  }
};

export const extractScoresFromImage = async (base64Image: string, studentNames: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const prompt = `
    이미지에서 학생의 이름과 점수를 찾아줘.
    우리 학원 학생 명단: ${studentNames.join(', ')}
    
    출력 형식은 반드시 JSON 배열이어야 해:
    [{"name": "학생이름", "score": 점수}]
    
    주의: 명단에 없는 이름은 가장 유사한 이름을 찾거나 무시해. 점수는 숫자만 추출해.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        { text: prompt }
      ],
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
