/**
 * services/geminiService.ts
 * Phiên bản tương thích với thư viện @google/generative-ai
 * - Dùng 1 API key từ localStorage hoặc .env (fallback)
 * - Cung cấp 3 hàm: generateStoryIdeas, generateCharacterDetails, generateScript
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { resolveApiKey } from "./userKey";

// ===== Helper =====
function normalizeError(e: any): Error {
  const msg = String(e?.message || e);
  if (/quota|exceed|rate|429|overload|unavailable/i.test(msg)) {
    return new Error("Model AI đang quá tải hoặc đã hết quota. Hãy thử lại hoặc dùng API key khác.");
  }
  if (/unauthorized|api key|invalid key|401|403/i.test(msg)) {
    return new Error("API key không hợp lệ hoặc chưa được cấp quyền.");
  }
  return new Error(msg || "Lỗi không xác định từ Gemini API.");
}

function client(apiKey?: string) {
  const key = resolveApiKey(apiKey);
  return new GoogleGenerativeAI(key);
}

// ===== Generic JSON Caller =====
export async function generateJSON<T>(
  contents: string,
  schema: any,
  {
    model = "gemini-2.5-flash",
    apiKey,
  }: { model?: string; apiKey?: string } = {}
): Promise<T> {
  try {
    const genAI = client(apiKey);
    const mdl = genAI.getGenerativeModel({
      model,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = await mdl.generateContent(contents);
    const text = result.response.text().trim();
    return JSON.parse(text) as T;
  } catch (e) {
    throw normalizeError(e);
  }
}

// ===== Business Functions =====

// 1. Generate story ideas
export async function generateStoryIdeas(
  idea: string,
  style: string,
  count: number,
  apiKey?: string
): Promise<Array<{ title: string; summary: string }>> {
  const schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING },
      },
      required: ["title", "summary"],
    },
  };
  const prompt = `Tạo ${count} ý tưởng câu chuyện dựa trên: "${idea}" theo phong cách "${style}".
Trả về MẢNG JSON, mỗi phần tử có "title" và "summary".`;
  return generateJSON(prompt, schema, { model: "gemini-2.5-flash", apiKey });
}

// 2. Generate character details
export async function generateCharacterDetails(
  story: { title: string; summary: string },
  numCharacters: number,
  style: string,
  apiKey?: string
): Promise<Array<{ name: string; prompt: string }>> {
  const schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        prompt: { type: SchemaType.STRING },
      },
      required: ["name", "prompt"],
    },
  };
  const contents = `Dựa trên câu chuyện "${story.title}" (tóm tắt: ${story.summary}), hãy tạo ${numCharacters} nhân vật chính.
Mỗi nhân vật trả về "name" và "prompt" (tiếng Anh, mô tả chi tiết ngoại hình/phong cách theo "${style}").
Kết quả là MẢNG JSON như yêu cầu.`;

  try {
    return await generateJSON(contents, schema, { model: "gemini-2.5-pro", apiKey });
  } catch {
    return await generateJSON(contents, schema, { model: "gemini-2.5-flash", apiKey });
  }
}

// 3. Generate script
export interface Scene {
  id: number;
  description: string;
  narration: string;
  veo_prompt: string;
  characters_present: string[];
}
export interface Script {
  summary: string;
  scenes: Scene[];
}

export async function generateScript(
  story: { title: string; summary: string },
  characters: Array<{ name: string; prompt: string }>,
  durationSec: number,
  apiKey?: string
): Promise<Script> {
  const expectedScenes = Math.ceil(durationSec / 8);
  const charDesc = characters.map(c => `- ${c.name}: ${c.prompt}`).join("\n");

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      summary: { type: SchemaType.STRING },
      scenes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.NUMBER },
            description: { type: SchemaType.STRING },
            narration: { type: SchemaType.STRING },
            veo_prompt: { type: SchemaType.STRING },
            characters_present: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ["id", "description", "narration", "veo_prompt", "characters_present"],
        },
      },
    },
    required: ["summary", "scenes"],
  };

  const contents = `Bạn là biên kịch. Hãy viết kịch bản video dài ${durationSec} giây (≈ ${expectedScenes} cảnh, mỗi cảnh 6–10 giây).
Thông tin:
- Tên: ${story.title}
- Tóm tắt: ${story.summary}
- Nhân vật:
${charDesc}

YÊU CẦU JSON:
{
  "summary": "tóm tắt kịch bản",
  "scenes": [
    {
      "id": 1,
      "description": "mô tả cảnh",
      "narration": "lời dẫn",
      "veo_prompt": "prompt để tạo video (Anh) – phải khớp mô tả cảnh",
      "characters_present": ["Tên nhân vật..."]
    }
  ]
}
Quy tắc:
- Mỗi cảnh phải có ít nhất 1 nhân vật trong "characters_present".
- "narration" bắt buộc có nội dung.
- "veo_prompt" phải ăn khớp mô tả cảnh và có tên nhân vật khi xuất hiện.`;

  try {
    return await generateJSON<Script>(contents, schema, { model: "gemini-2.5-pro", apiKey });
  } catch {
    return await generateJSON<Script>(contents, schema, { model: "gemini-2.5-flash", apiKey });
  }
}
