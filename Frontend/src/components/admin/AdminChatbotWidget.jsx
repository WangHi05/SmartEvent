import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authService } from '../../services/authService';

const API_BASE_URL = 'http://localhost:5013';

const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào Admin! Tôi là Trợ lý AI của SmartEvent.\nBạn cần tôi phân tích doanh thu, thống kê vé hay tra cứu chính sách gì hôm nay?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    
    setMessages((prev) => [
      ...prev,
      // FIX: Dùng crypto.randomUUID() để tạo ID duy nhất, tránh lỗi trùng Key
      { id: crypto.randomUUID(), sender: 'user', text: userMsg },
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      // CLEAN CODE: Gọi authService để lấy Token
      const token = authService.getToken(); 
      
      if (!token) {
        throw new Error("Không tìm thấy phiên đăng nhập Admin!");
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ question: userMsg }),
      });

      if (!response.ok) {
        if(response.status === 401) throw new Error("Phiên đăng nhập hết hạn.");
        if(response.status === 403) throw new Error("Không có quyền truy cập tính năng này.");
        throw new Error(`Lỗi Server: ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        // FIX: Cập nhật lại cách tạo ID
        { id: crypto.randomUUID(), sender: 'bot', text: data.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        // FIX: Cập nhật lại cách tạo ID
        { id: crypto.randomUUID(), sender: 'bot', text: `❌ Lỗi: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Nút bấm (Bong bóng nổi) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center relative group"
        >
          <Bot size={28} />
          {/* Chấm xanh online */}
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
          
          {/* Tooltip khi hover */}
          <span className="absolute -top-10 right-0 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
            Trợ lý AI SmartEvent
          </span>
        </button>
      )}

      {/* Cửa sổ Chat */}
      <div 
        className={`absolute bottom-0 right-0 w-[380px] sm:w-[450px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ height: '600px', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Chatbot SmartEvent</h3>
              <p className="text-orange-100 text-[10px] flex items-center font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
                Agentic RAG Active
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Khung tin nhắn */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm text-sm overflow-hidden ${
                  msg.sender === 'user'
                    ? 'bg-orange-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm prose prose-sm prose-orange max-w-none'
                }`}
              >
                {/* Sử dụng ReactMarkdown để render bảng biểu, in đậm từ AI */}
                {msg.sender === 'bot' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom CSS cho table do AI sinh ra
                      table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-gray-200 border" {...props} /></div>,
                      th: ({node, ...props}) => <th className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 border-b" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-orange-700" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex space-x-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Khung nhập liệu */}
        <div className="bg-white p-3 border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex space-x-2 items-center bg-gray-50 rounded-full p-1 border border-gray-200 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Hỏi về doanh thu, số vé sự kiện..."
              className="flex-1 bg-transparent text-gray-700 text-sm px-4 py-2 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-2 w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-gray-300"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[9px] text-gray-400 font-medium">Dữ liệu được truy xuất Real-time từ hệ thống.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminChatbotWidget;