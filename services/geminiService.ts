/**
 * src/services/geminiService.ts
 * Bản dùng thẳng REST API (fetch) – không phụ thuộc SDK nên hết lỗi import/typing.
 * Giữ đúng 2 hàm mà App đang gọi:
 *   - generateKeywords(form, apiKey?)
 *   - analyzeTrends(results, topic, language, apiKey?)
 */

import { resolveApiKey } from "./userKey";

// ---- Kiểu dữ liệu khớp với app ----
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

// ---- Cấu hình chung ----
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Chuẩn hoá lỗi để báo dễ hiểu */
function normalizeError(err: any): Error {
  const msg = String(err?.message || err || "");
  if (/quota|exceed|rate|429|overload|unavailable/i.test(msg)) {
    return new Error("Model AI đang quá tải hoặc đã hết quota. Hãy thử lại hoặc dùng API key khác.");
  }
  if (/unauthorized|api key|invalid|401|403/i.test(msg)) {
    return new Error("API key không hợp lệ hoặc chưa được cấp quyền.");
  }
  return new Error(msg || "Lỗi không xác định từ Gemini API.");
}

/**
 * Gọi Gemini generateContent qua REST.
 * - model: ví dụ "gemini-2.5-flash" hoặc "gemini-2.5-pro"
 * - prompt: văn bản đầu vào
 * - expectJson: nếu true, yêu cầu model trả về JSON (responseMimeType = application/json)
 */
async function callGemini(
  model: string,
  prompt: string,
  expectJson: boolean,
  apiKey?: string
): Promise<string> {
  const key = resolveApiKey(apiKey);
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
    key
  )}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  if (expectJson) {
    body.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw normalizeError(e);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw normalizeError(new Error(`HTTP ${resp.status} – ${detail}`));
  }

  const data = await resp.json();
  // Các trường khác nhau tùy model; lấy text từ candidates[0].content.parts[].text
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ??
    data?.text ??
    "";

  return (typeof text === "string" ? text : String(text)).trim();
}

/**
 * Tạo danh sách từ khoá YouTube.
 * Trả về mảng [{ keyword, translation }].
 */
export async function generateKeywords(
  form: FormData,
  apiKey?: string
): Promise<KeywordResult[]> {
  const { topic, mainKeywords, competitorUrl, language, audience, count } = form;

  const sys =
    `Bạn là chuyên gia SEO YouTube. Hãy tạo danh sách từ khoá theo yêu cầu.\n` +
    `CHỈ TRẢ VỀ JSON THUẦN theo dạng: ` +
    `[{"keyword":"...","translation":"..."}, ...]`;

  const prompt = `
${sys}

Chủ đề chính: "${topic}"
Ngôn ngữ hiển thị từ khoá: ${language}
Đối tượng mục tiêu: ${audience}
Số lượng từ khoá cần tạo: ${count}
${mainKeywords ? `Từ khoá gợi ý (nếu hữu ích): ${mainKeywords}` : ""}
${competitorUrl ? `Tham khảo link đối thủ (nếu phù hợp): ${competitorUrl}` : ""}

YÊU CẦU:
- "keyword": ưu tiên đúng ${language} (hoặc tiếng Anh nếu xu hướng quốc tế).
- "translation": dịch sang Tiếng Việt dễ hiểu.
- KHÔNG giải thích, KHÔNG thêm chữ nào khác ngoài JSON hợp lệ.
  `.trim();

  try {
    const text = await callGemini("gemini-2.5-flash", prompt, true, apiKey);
    const json = JSON.parse(text);
    const list = (Array.isArray(json) ? json : []) as any[];
    return list
      .map((x) => ({
        keyword: String(x?.keyword || "").trim(),
        translation: String(x?.translation || "").trim(),
      }))
      .filter((x) => x.keyword);
  } catch (e) {
    throw normalizeError(e);
  }
}

/**
 * Phân tích xu hướng từ danh sách từ khoá (trả về Markdown/HTML ngắn gọn).
 */
export async function analyzeTrends(
  results: KeywordResult[],
  topic: string,
  language: string,
  apiKey?: string
): Promise<string> {
  const list = results
    .map((r, i) => `${i + 1}. ${r.keyword} — (${r.translation})`)
    .join("\n");

  const prompt = `
Phân tích xu hướng từ khoá cho kênh YouTube.
Chủ đề: "${topic}"
Ngôn ngữ từ khoá: ${language}

Danh sách từ khoá:
${list}

Hãy trả về báo cáo ngắn gọn dạng Markdown:
- Tóm tắt xu hướng (2–3 dòng)
- 3–5 nhóm chủ đề nổi bật (gạch đầu dòng)
- Cơ hội & rủi ro (gạch đầu dòng)
- 5–10 tiêu đề video mẫu (in đậm **Tiêu đề**, có thể kèm hashtag)
  `.trim();

  try {
    return await callGemini("gemini-2.5-flash", prompt, false, apiKey);
  } catch (e) {
    throw normalizeError(e);
  }
}
