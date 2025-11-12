// ----- NỘI DUNG MỚI CHO FILE App.tsx -----

import React, { useState, useCallback } from 'react';
import { useApiKey, ApiKeyInput } from './ApiKeyManager'; // Import bộ quản lý key
import { generateKeywords, analyzeTrends } from './services/geminiService';
import type { FormData, KeywordResult } from './types';
import { SUGGESTED_TOPICS, LANGUAGES, AUDIENCES } from './constants';

// --- Helper Functions & Components (Không thay đổi) ---
declare global {
  interface Window {
    XLSX: any;
  }
}
const exportToExcel = (data: KeywordResult[], topic: string) => {
  const formattedData = data.map(item => ({ 'Từ khóa': item.keyword, 'Bản dịch Tiếng Việt': item.translation }));
  const worksheet = window.XLSX.utils.json_to_sheet(formattedData);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Keywords');
  const cols = [{ wch: 40 }, { wch: 40 }];
  worksheet['!cols'] = cols;
  const fileName = `youtube_keywords_${topic.replace(/\s+/g, '_')}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);
};
const IconLogo: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconClipboard: React.FC<{copied: boolean}> = ({ copied }) => (
    copied ? 
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    :
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

// --- Component chứa Tool chính của bạn ---
// Toàn bộ code cũ của bạn được chuyển vào đây
const MainToolComponent = () => {
  const { apiKey, setApiKey } = useApiKey(); // Lấy API Key và hàm để thay đổi key

  const [formData, setFormData] = useState<FormData>({
    topic: '',
    mainKeywords: '',
    competitorUrl: '',
    language: 'English',
    audience: 'Foreign viewers',
    count: 10,
  });
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [isTrendLoading, setIsTrendLoading] = useState<boolean>(false);
  const [trendAnalysisResult, setTrendAnalysisResult] = useState<string | null>(null);
  const [isTrendModalOpen, setIsTrendModalOpen] = useState<boolean>(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'count' ? parseInt(value) : value }));
  }, []);

  const handleSuggestionClick = useCallback((topic: string) => {
    setFormData(prev => ({ ...prev, topic }));
    setIsModalOpen(false);
  }, []);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) { // Kiểm tra lại lần nữa cho chắc
      setError('Lỗi: Không tìm thấy API Key.');
      return;
    }
    if (!formData.topic) {
      setError('Chủ đề là bắt buộc.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setResults(null);
    try {
      // *** THAY ĐỔI QUAN TRỌNG: Truyền apiKey vào hàm generateKeywords ***
      const keywords = await generateKeywords(formData, apiKey);
      setResults(keywords);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setResults(null);
    setError(null);
  };
  
  const handleAnalyzeTrends = async () => {
    if (!results || !apiKey) return;

    setIsTrendLoading(true);
    setTrendError(null);
    setTrendAnalysisResult(null);
    try {
        // *** THAY ĐỔI QUAN TRỌNG: Truyền apiKey vào hàm analyzeTrends ***
        const analysis = await analyzeTrends(results, formData.topic, formData.language, apiKey);
        setTrendAnalysisResult(analysis);
        setIsTrendModalOpen(true);
    } catch (err: any) {
        setTrendError(err.message || 'An unknown error occurred during trend analysis.');
        setIsTrendModalOpen(true);
    } finally {
        setIsTrendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <IconLogo />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Tool Tìm Key Youtube</h1>
              <p className="text-sm text-cyan-400">Công cụ siêu đỉnh để tự động hoá mọi việc. Hotline: 0916 590 161</p>
            </div>
          </div>
          <button
            onClick={() => setApiKey(null)}
            className="bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg hover:bg-red-600 hover:text-white transition"
          >
            Thay đổi Key
          </button>
        </header>

        <main>
          {/* Form Card */}
          {!results && (
             <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-cyan-300"># Chủ Đề (Bắt buộc)</label>
                            <input type="text" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="vd: Sinh tồn hoang dã, Mukbang AI" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(true)} className="w-full bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition duration-300 flex items-center justify-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.332a.75.75 0 01.442.686l.334 2.666a.75.75 0 01-.686.832l-2.666.334a.75.75 0 01-.832-.686l-.334-2.666a.75.75 0 01.686-.832L9 4.332V3a1 1 0 011-1zm0 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" clipRule="evenodd" /><path d="M10 1a9 9 0 100 18 9 9 0 000-18zM3 10a7 7 0 1114 0 7 7 0 01-14 0z" /></svg>
                            Danh sách gợi ý
                        </button>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-400"># Từ Khóa Chính (Tùy chọn)</label>
                            <input type="text" name="mainKeywords" value={formData.mainKeywords} onChange={handleInputChange} placeholder="vd: xây nhà trú ẩn, ăn đồ siêu cay" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-400">🔗 Link Video Đối Thủ (Tùy chọn)</label>
                            <input type="url" name="competitorUrl" value={formData.competitorUrl} onChange={handleInputChange} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-cyan-300">🌐 Ngôn Ngữ</label>
                            <select name="language" value={formData.language} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition appearance-none">
                                {LANGUAGES.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-cyan-300">👥 Đối Tượng Mục Tiêu</label>
                             <select name="audience" value={formData.audience} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition appearance-none">
                                {AUDIENCES.map(aud => <option key={aud.value} value={aud.value}>{aud.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-cyan-300"># Số lượng từ khóa</label>
                            <input type="number" name="count" value={formData.count} onChange={handleInputChange} min="1" max="50" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
                        </div>
                    </div>
                    {/* Submit Button */}
                    <div className="md:col-span-2 mt-4">
                        {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition duration-300 flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014a8.003 8.003 0 0110.014 10.014C19.5 15.5 17 16 17 14c1 2 2.657 1.657 2.657 1.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 14.121A3 3 0 1014.12 9.88l-4.242 4.242z" /></svg>
                            {isLoading ? 'Đang tìm kiếm...' : 'Tìm Kiếm Từ Khóa'}
                        </button>
                    </div>
                </form>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !results && (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg text-center">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                 <p className="mt-4 text-lg">AI đang phân tích, vui lòng chờ...</p>
                 <p className="text-slate-400">Quá trình này có thể mất một vài giây.</p>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg backdrop-blur-sm mt-8 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Kết Quả Đề Xuất</h2>
                 <button onClick={handleAnalyzeTrends} disabled={isTrendLoading} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-500 transition duration-300 text-sm flex items-center justify-center gap-2 disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {isTrendLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    )}
                    {isTrendLoading ? 'Đang phân tích...' : 'Đo trend Xu Hướng'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="p-3 text-sm font-semibold uppercase text-slate-400 w-12">STT</th>
                      <th className="p-3 text-sm font-semibold uppercase text-slate-400">Từ Khóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-slate-400">{index + 1}</td>
                        <td className="p-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-cyan-400">{result.keyword}</p>
                                    <p className="text-sm text-slate-400">({result.translation})</p>
                                </div>
                                <button onClick={() => handleCopy(result.keyword, index)} title="Copy keyword" className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition">
                                    <IconClipboard copied={copiedIndex === index} />
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end">
                <button onClick={() => exportToExcel(results, formData.topic)} className="bg-yellow-500 text-slate-900 font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition duration-300 flex items-center justify-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải file Excel
                </button>
                <button onClick={handleNewSearch} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-500 transition duration-300 flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.13-5.26M20 15a9 9 0 01-14.13 5.26" /></svg>
                  Tìm kiếm mới
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Modals... */}
      {isModalOpen && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}> <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-4"> <h2 className="text-xl font-bold text-white">Danh Sách Chủ Đề Gợi Ý</h2> <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button> </div> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"> {SUGGESTED_TOPICS.map(topic => ( <button key={topic} onClick={() => handleSuggestionClick(topic)} className="bg-slate-700 text-center text-sm p-3 rounded-lg hover:bg-cyan-600 hover:text-white transition duration-200"> {topic} </button> ))} </div> </div> </div> )}
      {isTrendModalOpen && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setIsTrendModalOpen(false)}> <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col p-6" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-4 flex-shrink-0"> <h2 className="text-xl font-bold text-white">Phân Tích Xu Hướng Từ Khóa</h2> <button onClick={() => setIsTrendModalOpen(false)} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button> </div> <div className="overflow-y-auto pr-2 text-slate-300"> {trendError ? ( <p className="text-red-400">{trendError}</p> ) : ( <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: trendAnalysisResult ? trendAnalysisResult.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\n/g, '<br />') : '' }}> </div> )} </div> </div> </div> )}
    </div>
  );
}

// --- Component App chính (gatekeeper) ---
// Component này sẽ quyết định hiển thị màn hình nào
function App() {
  const { apiKey, isLoading } = useApiKey();

  // Màn hình chờ trong lúc kiểm tra key
  if (isLoading) {
    return <div className="bg-slate-900 text-slate-200 min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  // Nếu chưa có key, hiện form nhập
  if (!apiKey) {
    return <ApiKeyInput />;
  }

  // Nếu có key rồi, hiện tool chính
  return <MainToolComponent />;
}

export default App;
