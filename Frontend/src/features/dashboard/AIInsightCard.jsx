import React, { useState } from 'react';
import { AlertTriangle, QrCode, Sparkles, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient'; 

const AIInsightCard = ({ overviewData }) => {
  const [analysisText, setAnalysisText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAiAnalysis = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Gửi request lấy dữ liệu
      const response = await axiosClient.post('/analytics/ai-report', { data: overviewData || {} });
      
      // 2. Lấy nội dung trả về
      const content = response.analysisContent || (response.data && response.data.analysisContent);
      
      if (content) {
        setAnalysisText(content);
      } else {
        setError('Không nhận được dữ liệu phân tích từ máy chủ.');
      }
    } catch (err) {
      setError('Không thể kết nối đến AI Server. Vui lòng thử lại sau.');
      console.error('Lỗi chi tiết:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div className="w-full">
          <h4 className="flex items-center text-lg font-bold mb-3">
            <Sparkles className="mr-2 text-yellow-300" size={20} />
            Cố vấn AI (Gemini)
          </h4>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 min-h-[100px] border border-white/20">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-indigo-100 py-4">
                 <Loader2 className="animate-spin mb-2" size={24} />
                 <p className="text-sm text-center">AI đang tổng hợp và phân tích dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="text-red-200 text-sm flex items-start">
                <AlertTriangle className="mr-2 shrink-0" size={16} />
                {error}
              </div>
            ) : analysisText ? (
              <div 
                className="text-sm text-white leading-relaxed space-y-2"
                dangerouslySetInnerHTML={{ 
                  __html: analysisText
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-200">$1</strong>') 
                }} 
              />
            ) : (
              <p className="text-indigo-100 text-sm">
                Nhấn nút bên dưới để AI bắt đầu quét dữ liệu sự kiện hiện tại, dự báo tỷ lệ check-in và đưa ra khuyến nghị điều phối cổng.
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <button 
              onClick={fetchAiAnalysis}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center
                ${isLoading ? 'bg-indigo-400 text-indigo-100 cursor-not-allowed' : 'bg-white text-indigo-700 hover:bg-indigo-50'}`}
            >
              {isLoading ? 'Đang phân tích...' : 'Phân tích dữ liệu hiện tại'}
            </button>
            
            {analysisText && !isLoading && (
              <button className="bg-indigo-700 bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-70 transition-colors border border-indigo-400">
                Lưu báo cáo AI
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 pointer-events-none">
        <QrCode size={120} />
      </div>
    </div>
  );
};

export default AIInsightCard;