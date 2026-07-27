import React, { useState, useRef } from 'react';
import { AlertTriangle, QrCode, Sparkles, Loader2, Download } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AIInsightCard = ({ overviewData }) => {
  const [analysisText, setAnalysisText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef(null); // vẫn giữ để hiển thị trên UI, không dùng để xuất PDF nữa

  const fetchAiAnalysis = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axiosClient.post('/analytics/ai-report', { data: overviewData || {} });
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

  // Tách văn bản AI trả về thành các khối: đoạn văn thường hoặc mục có tiêu đề in đậm
  // Ví dụ dòng "1. **Kiểm tra hệ thống**: Đảm bảo..." sẽ tách thành { title, body }
  const parseAnalysisBlocks = (text) => {
    if (!text) return [];
    return text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l !== '')
      .map((line) => {
        const cleaned = line.replace(/^\d+\.\s*/, ''); // bỏ số thứ tự "1. "
        const match = cleaned.match(/^\*\*(.+?)\*\*[:：]?\s*(.*)$/);
        if (match) {
          return { type: 'item', title: match[1], body: match[2] };
        }
        return { type: 'paragraph', text: line.replace(/\*\*(.*?)\*\*/g, '$1') };
      });
  };

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const handleSaveReport = async () => {
    if (!analysisText) return;
    setIsSaving(true);

    // Tạo template riêng cho PDF, đặt ngoài màn hình, không dùng nền tối/gradient của UI
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '780px';
    container.style.background = '#ffffff';
    container.style.padding = '32px';
    container.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    container.style.color = '#1f2937';

    try {
      const now = new Date();
      const dateStr = now.toLocaleString('vi-VN');
      const blocks = parseAnalysisBlocks(analysisText);

      const blocksHtml = blocks
        .map((b) => {
          if (b.type === 'item') {
            return `<div style="margin:10px 0;padding:12px 14px;background:#f5f3ff;border-left:4px solid #6d28d9;border-radius:6px;">
              <div style="font-weight:700;color:#4c1d95;font-size:13px;margin-bottom:4px;">${escapeHtml(b.title)}</div>
              <div style="font-size:13px;line-height:1.6;">${escapeHtml(b.body)}</div>
            </div>`;
          }
          return `<p style="font-size:13px;line-height:1.7;margin:8px 0;">${escapeHtml(b.text)}</p>`;
        })
        .join('');

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #6d28d9;padding-bottom:14px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img id="pdf-logo-img" src="/logo.png" style="width:38px;height:38px;object-fit:contain;" />
            <div style="font-size:19px;font-weight:700;color:#1f2937;">SmartEvent</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.5;">
            Ngày tạo: ${dateStr}
          </div>
        </div>
        <h2 style="font-size:19px;color:#4c1d95;margin:0 0 4px 0;">Báo cáo Cố vấn AI</h2>
        <div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Được tạo tự động bởi hệ thống phân tích AI của SmartEvent</div>
        ${blocksHtml}
        <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;">
          Báo cáo được tạo tự động — SmartEvent © ${now.getFullYear()}
        </div>
      `;

      document.body.appendChild(container);

      // Đợi logo load xong (hoặc lỗi) trước khi chụp, tránh trường hợp html2canvas
      // chụp lúc ảnh chưa kịp hiển thị khiến logo bị trống trong PDF
      const logoImg = container.querySelector('#pdf-logo-img');
      if (logoImg && !logoImg.complete) {
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });
      }

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const pxToMm = usableWidth / canvas.width;
      const pageHeightPx = usableHeight / pxToMm; // chiều cao tối đa 1 trang, tính theo px của canvas gốc

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeight);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, renderedHeight, canvas.width, sliceHeightPx,
          0, 0, canvas.width, sliceHeightPx
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageImgData, 'PNG', margin, margin, usableWidth, sliceHeightPx * pxToMm);

        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Trang ${pageIndex + 1}`, pageWidth / 2, pageHeight - 6, { align: 'center' });

        renderedHeight += sliceHeightPx;
        pageIndex += 1;
      }

      const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
      pdf.save(`BaoCao_AI_${timestamp}.pdf`);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      alert('Không thể xuất báo cáo PDF. Vui lòng thử lại.');
      if (container.parentNode) document.body.removeChild(container);
    } finally {
      setIsSaving(false);
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

          <div ref={contentRef} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 min-h-[100px] border border-white/20">
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
              <button
                onClick={handleSaveReport}
                disabled={isSaving}
                className="bg-indigo-700 bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-70 transition-colors border border-indigo-400 flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Đang xuất PDF...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Lưu báo cáo AI
                  </>
                )}
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