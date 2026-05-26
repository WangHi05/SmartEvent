import { useState, useRef, useEffect } from 'react';
import apiClient from '../services/apiClient';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Xin chào! 👋 Tôi là trợ lý CSKH của SmartEvent. Tôi có thể giúp bạn với các câu hỏi về sự kiện, vé, và chính sách hoàn tiền. Bạn cần giúp gì?',
      timestamp: new Date()
    }
  ]);

  const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const quickActions = [
    { label: 'Sự kiện đang mở bán', message: 'Cho tôi xem các sự kiện đang mở bán' },
    { label: 'Giá vé và loại vé', message: 'Cho tôi biết các loại vé và giá vé hiện có' },
    { label: 'Hướng dẫn đặt vé', message: 'Hướng dẫn tôi cách đặt vé từng bước' },
    { label: 'Thanh toán', message: 'Thanh toán như thế nào?' },
    { label: 'Xem vé đã mua', message: 'Tôi đã mua vé rồi thì xem vé ở đâu?' },
    { label: 'Hủy / hoàn tiền', message: 'Chính sách hủy vé và hoàn tiền như thế nào?' },
    { label: 'Check-in QR', message: 'Tôi check-in bằng mã QR như thế nào?' },
    { label: 'Liên hệ hỗ trợ', message: 'Tôi muốn liên hệ nhân viên hỗ trợ' },
    { label: 'Trạng thái đơn hàng', message: 'Đơn hàng của tôi đang ở trạng thái nào?' },
    { label: 'Chưa nhận được vé', message: 'Tôi chưa nhận được vé' },
    { label: 'Sửa thông tin mua vé', message: 'Tôi nhập sai thông tin người mua' },
    { label: 'Thanh toán thất bại', message: 'Thanh toán thất bại phải làm sao?' }
  ];
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll đến message mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
  };

  const renderStructuredEvents = (events) => {
    if (!Array.isArray(events) || events.length === 0) return null;
    return (
      <div className="space-y-2">
        {events.map((evt, idx) => {
          const eventId = evt.id || evt.Id || `evt-${idx}`;
          const eventName = evt.name || evt.Name || 'Sự kiện';
          const startTime = evt.startTime || evt.StartTime;
          const endTime = evt.endTime || evt.EndTime;
          const location = evt.location || evt.Location;

          // Support different casings for ticket types
          const rawTicketTypes = evt.ticketTypes || evt.TicketTypes || [];
          const ticketTypes = Array.isArray(rawTicketTypes) ? rawTicketTypes.map((tt) => ({
            id: tt.id || tt.Id || undefined,
            name: tt.name || tt.Name || '',
            price: tt.price ?? tt.Price ?? 0,
            remainingQuantity: tt.remainingQuantity ?? tt.RemainingQuantity ?? 0
          })) : [];

          return (
            <div key={eventId} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{eventName}</div>
                  <div className="text-xs text-gray-600">{formatDateTimeRange(startTime, endTime)}</div>
                  {location && <div className="text-xs text-gray-600">📍 {location}</div>}
                </div>
              </div>
              {ticketTypes.length > 0 && (
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  {ticketTypes.map((tt, i) => (
                    <div key={tt.id || i} className="flex items-center justify-between">
                      <div className="truncate">- {tt.name}</div>
                      <div className="ml-2">{formatCurrency(Number(tt.price))} (Còn {tt.remainingQuantity})</div>
                    </div>
                  ))}
                </div>
              )}
              {ticketTypes.length === 0 && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  Chưa có loại vé đang mở bán.
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const formatDateTimeRange = (startTime, endTime) => {
    const start = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(startTime));
    const end = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(endTime));
    return `${start} - ${end}`;
  };

  const buildConversationHistory = (items) => {
    return items
      .slice(-6)
      .map((item) => ({
        role: item.type === 'user' ? 'user' : 'assistant',
        content: item.text
      }))
      .filter((item) => item.content && item.content.trim());
  };

  const sendChatRequest = async (messageText, historySource) => {
    const response = await apiClient.post('/ai/customer-support', {
      message: messageText,
      history: buildConversationHistory(historySource)
    });

    if (response?.isSuccess) {
      return {
        id: createMessageId(),
        type: 'bot',
        text: response.answer,
        responseType: response.responseType,
        data: response.data,
        timestamp: new Date()
      };
    }

    return {
      id: createMessageId(),
      type: 'bot',
      text: response?.answer || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
      timestamp: new Date(),
      isError: true
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const trimmedInput = inputValue.trim();
    const historyBeforeSend = messages;

    const userMessage = {
      id: createMessageId(),
      type: 'user',
      text: trimmedInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const botMessage = await sendChatRequest(trimmedInput, historyBeforeSend);
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const backendMessage = error?.response?.data?.answer;
      const errorMessage = {
        id: createMessageId(),
        type: 'bot',
        text: backendMessage || 'Hiện tại trợ lý AI đang gặp sự cố kết nối. Bạn vui lòng thử lại sau hoặc liên hệ nhân viên hỗ trợ.',
        timestamp: new Date(),
        isError: !backendMessage
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chatbot API Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    if (!action || !action.message) return;

    const actionMessage = action.message.trim();
    const historyBeforeSend = messages;
    const userMessage = {
      id: createMessageId(),
      type: 'user',
      text: actionMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const botMessage = await sendChatRequest(actionMessage, historyBeforeSend);
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const backendMessage = err?.response?.data?.answer;
      const botMessage = {
        id: createMessageId(),
        type: 'bot',
        text: backendMessage || 'Hiện tại trợ lý AI đang gặp sự cố kết nối. Bạn vui lòng thử lại sau hoặc liên hệ nhân viên hỗ trợ.',
        timestamp: new Date(),
        isError: !backendMessage
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
          title="Mở chatbot hỗ trợ"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-0 right-0 w-96 h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">SmartEvent Support</h3>
              <p className="text-xs opacity-90">Chatbot hỗ trợ khách hàng 24/7</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 rounded-full p-1 transition-colors"
              title="Đóng chatbot"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* Quick Actions */}
            <div className="mb-2">
              <div className="text-sm text-gray-600 mb-2">Gợi ý nhanh:</div>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleQuickAction(q)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Ví dụ: "Giá vé Music Festival là bao nhiêu?"</p>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : msg.isError
                      ? 'bg-red-100 text-red-800 rounded-bl-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {Array.isArray(msg.data) && msg.data.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed break-words font-medium whitespace-pre-line">{msg.text}</p>
                      <div className="space-y-3">
                        {renderStructuredEvents(msg.data)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-line">{msg.text}</p>
                  )}
                  <p className={`text-xs mt-1 ${
                    msg.type === 'user' ? 'opacity-70' : 'opacity-60'
                  }`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập câu hỏi của bạn..."
                disabled={isLoading}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg px-4 py-2 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9-9m0 0l-9-9m9 9H3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
