// ----- NỘI DUNG MỚI - SỬ DỤNG GEMINI 1.5 PRO -----

import { GoogleGenAI, Type } from "@google/genai";
import type { FormData, KeywordResult } from "../types";

const KEYWORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    keywords: {
      type: Type.ARRAY,
      description: "An array of keyword objects.",
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: {
            type: Type.STRING,
            description: "The generated keyword in the target language.",
          },
          translation: {
            type: Type.STRING,
            description: "The Vietnamese translation of the keyword.",
          },
        },
        required: ["keyword", "translation"],
      },
    },
  },
  required: ["keywords"],
};

export const generateKeywords = async (formData: FormData, apiKey: string): Promise<KeywordResult[]> => {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `You are an expert in YouTube SEO and content strategy. Your task is to generate a list of high-traffic, low-competition keywords for a YouTube video.

**Video Details:**
*   **Main Topic:** ${formData.topic}
*   **Primary Keywords:** ${formData.mainKeywords || "Not provided"}
*   **Competitor Video for Analysis (optional):** ${formData.competitorUrl || "Not provided"}
*   **Target Language:** ${formData.language}
*   **Target Audience:** ${formData.audience}

**Request:**
1.  Generate exactly ${formData.count} unique keywords.
2.  The keywords should be in the target language: "${formData.language}".
3.  For each keyword, provide a Vietnamese translation.
4.  The keywords should be creative, engaging, and highly relevant to the provided topic and primary keywords. If a competitor video is provided, analyze its title, description, and potential tags to find related but less competitive keyword opportunities.

**Output Format:**
Return the result as a single JSON object. Do not include any text, explanation, or markdown formatting before or after the JSON object. The JSON object must match the provided schema.
`;

  try {
    const response = await ai.models.generateContent({
      // *** THAY ĐỔI: Sử dụng model Gemini 1.5 Pro ***
      model: "gemini-1.5-pro-latest", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: KEYWORD_SCHEMA,
        temperature: 0.8,
        topP: 0.9,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    if (parsedJson.keywords && Array.isArray(parsedJson.keywords)) {
      return parsedJson.keywords;
    } else {
      throw new Error("Invalid JSON structure received from API.");
    }
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error.message.includes('API key not valid')) {
        throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn.");
    }
    throw new Error(
      "Không thể tạo từ khóa. Vui lòng kiểm tra lại thông tin đầu vào hoặc thử lại sau."
    );
  }
};

export const analyzeTrends = async (keywords: KeywordResult[], topic: string, language: string, apiKey: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const keywordList = keywords.map(k => `- "${k.keyword}" (${k.translation})`).join('\n');

  const prompt = `Bạn là một chuyên gia phân tích xu hướng YouTube. Dựa vào danh sách từ khóa được cung cấp cho chủ đề "${topic}", hãy đưa ra một bản phân tích chi tiết về xu hướng và tiềm năng của chúng.

**Chủ đề chính:** ${topic}
**Ngôn ngữ mục tiêu:** ${language}

**Danh sách từ khóa:**
${keywordList}

**Yêu cầu phân tích:**
1.  **Đánh giá tổng quan:** Phân tích tiềm năng chung của các từ khóa này. Chúng có đang là xu hướng không? Mức độ cạnh tranh có thể như thế nào?
2.  **Từ khóa nổi bật:** Chỉ ra 3-5 từ khóa có tiềm năng viral cao nhất hoặc đang có xu hướng tìm kiếm tăng mạnh. Giải thích tại sao.
3.  **Từ khóa "Evergreen" (Xanh quanh năm):** Xác định những từ khóa có thể không tạo ra đột biến lớn ban đầu nhưng sẽ mang lại lượt xem ổn định theo thời gian.
4.  **Gợi ý kết hợp:** Đề xuất một vài cách kết hợp các từ khóa này để tạo thành các tiêu đề video hấp dẫn, có khả năng thu hút cao.
5.  **Lời khuyên cuối cùng:** Đưa ra một lời khuyên ngắn gọn cho nhà sáng tạo nội dung về cách tận dụng tốt nhất bộ từ khóa này.

Hãy trình bày câu trả lời bằng tiếng Việt, sử dụng định dạng rõ ràng, dễ đọc, với các tiêu đề được in đậm.
`;

  try {
    const response = await ai.models.generateContent({
      // *** THAY ĐỔI: Sử dụng model Gemini 1.5 Pro ***
      model: "gemini-1.5-pro-latest", 
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      },
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Error calling Gemini API for trend analysis:", error);
    if (error.message.includes('API key not valid')) {
        throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn.");
    }
    throw new Error(
      "Không thể phân tích xu hướng. Vui lòng thử lại sau."
    );
  }
};
