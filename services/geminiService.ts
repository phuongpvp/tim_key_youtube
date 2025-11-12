/**
 * services/geminiService.ts
 * Dành cho package: @google/genai  (giữ nguyên như trong package.json của bạn)
 * - Không thay đổi thư viện.
 * - Dùng 1 API key (localStorage hoặc .env thông qua resolveApiKey).
 * - Expose 2 hàm đúng với App.tsx: generateKeywords, analyzeTrends.
 *
 * Lưu ý: API của @google/genai thay đổi giữa các bản, nên ở đây dùng kiểu "any"
 * khi gọi SDK để tránh lỗi type trong quá trình build (Vercel). Cách gọi vẫn hoạt động.
 */

// Giữ import như thế này để trình bundler lấy đúng thư viện
import { GoogleGenAI } from "@google/genai";
import { resolveApiKey } from "./userKey";

export interface FormData {
  topic: string;
  mainKeywords?: string;
  competitorUrl?: string;
  language: string;
  audience: string;
  count: number;
}

export interface KeywordResult {
  keyword: string;
  translation: string;
}

// ---- Helpers ----
function getClient(apiKey?: string): any {
  const key = resolveApiKey(apiKey);
  // Một số version nhận object { apiKey }, 1 số nhận trực tiếp apiKey → dùng cách an toàn
  try {
    // @ts-ignore
    return new (GoogleGenAI as any)({ apiKey: key });
  } catch {
    // @ts-ignore
    return new (GoogleGenAI as any)(key);
  }
}

function toError(e: any): Error {
  const msg = String(e?.message || e);
  if (/quota|exceed|rate|429|overload|unavailable/i.test(msg)) {
    return new Error("Model AI đang quá tải hoặc đã hết quota. Hãy thử lại hoặc dùng API key khác.");
  }
  if (/unauthorized|api key|invalid key|401|403/i.test(msg)) {
    return new Error("API key không hợp lệ hoặc chưa được cấp quyền.");
  }
  return new Error(msg || "Lỗi không xác định từ Gemini API.");
}

// Gọi JSON (ràng buộc model trả JSON)
async function callJSON(prompt: string, modelName: string, apiKey?: string): Promise<any> {
  const sdk: any = getClient(apiKey);
  try {
    // Một số version dùng sdk.models.generateContent, vài bản dùng sdk.generateContent
    const fn =
      (sdk?.models?.generateContent?.bind(sdk)) ||
      (sdk?.generateContent?.bind(sdk));

    if (!fn) throw new Error("SDK không có phương thức generateContent.");

    const res: any = await fn({
      model: modelName,
      contents: prompt,
      // Các nhánh tên config khác nhau giữa các version → set cả hai
      config: { responseMimeType: "application/json" },
      responseMimeType: "application/json",
    });

    // Thu thập text theo nhiều nhánh khác nhau giữa các version
    const text =
      res?.text?.() ||
      res?.output_text ||
      res?.response?.text?.() ||
      res?.data ||
      "";

    const raw = (typeof text === "string" ? text : String(text)).trim();
    return JSON.parse(raw);
  } catch (e) {
    throw toError(e);
  }
}

// Gọi text (không ràng buộc JSON)
async function callText(prompt: string, modelName: string, apiKey?: string): Promise<string> {
  const sdk: any = getClient(apiKey);
  try {
    const fn =
      (sdk?.models?.generateContent?.bind(sdk)) ||
      (sdk?.generateContent?.bind(sdk));

    if (!fn) throw new Error("SDK không có phương thức generateContent.");

    const res: any = await fn({ model: modelName, contents: prompt });
    const text =
      res?.text?.() ||
      res?.output_text ||
      res?.response?.text?.() ||
      res?.data ||
      "";
    return (typeof text === "string" ? text : String(text)).trim();
  } catch (e) {
    throw toError(e);
  }
}

/**
 * Tạo danh sách từ khoá YouTube.
 * Trả về mảng [{ keyword, translation }].
 */
export async function generateKeywords(form: FormData, apiKey?: string): Promise<KeywordResult[]> {
  const { topic, mainKeywords, competitorUrl, language, audience, count } = form;

  const sys = `Bạn là chuyên gia SEO YouTube. Hãy tạo danh sách từ khoá theo yêu cầu.
Kết quả trả về JSON THUẦN: [{"keyword":"...","translation":"..."}] (không thêm chữ nào khác).`;

  const prompt = `
${sys}

Chủ đề: "${topic}"
Ngôn ngữ hiển thị từ khoá: ${language}
Đối tượng mục tiêu: ${audience}
Số lượng cần tạo: ${count}
${mainKeywords ? `Từ khoá gợi ý (nếu hữu ích): ${mainKeywords}` : ""}
${competitorUrl ? `Tham khảo đối thủ (nếu phù hợp): ${competitorUrl}` : ""}

YÊU CẦU:
- "keyword": ưu tiên đúng ${language} (hoặc tiếng Anh nếu xu hướng quốc tế).
- "translation": dịch sang Tiếng Việt dễ hiểu.
- Chỉ trả JSON hợp lệ, không giải thích.
`;

  const data = await callJSON(prompt, "gemini-2.5-flash", apiKey);
  return (Array.isArray(data) ? data : []).map((x: any) => ({
    keyword: String(x?.keyword || "").trim(),
    translation: String(x?.translation || "").trim(),
  })).filter((x: any) => x.keyword);
}

/**
 * Phân tích xu hướng từ danh sách từ khoá (trả về Markdown ngắn gọn).
 */
export async function analyzeTrends(
  results: KeywordResult[],
  topic: string,
  language: string,
  apiKey?: string
): Promise<string> {
  const list = results.map((r, i) => `${i + 1}. ${r.keyword} — (${r.translation})`).join("\n");

  const prompt = `Phân tích xu hướng từ khoá cho kênh YouTube.
Chủ đề: "${topic}"
Ngôn ngữ từ khoá: ${language}

Danh sách từ khoá:
${list}

Hãy trả về Markdown ngắn gọn:
- Tóm tắt xu hướng (2-3 dòng)
- 3-5 nhóm chủ đề nổi bật (gạch đầu dòng)
- Cơ hội & rủi ro (gạch đầu dòng)
- 5-10 tiêu đề video mẫu (in đậm **Tiêu đề**, có thể kèm hashtag)
`;

  return callText(prompt, "gemini-2.5-flash", apiKey);
}
