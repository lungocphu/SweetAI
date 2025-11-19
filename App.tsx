import React, { useState, useRef, useEffect } from 'react';
import { Message, Language, ComparisonAttribute } from './types';
import { sendMessageStream } from './services/gemini';
import MessageBubble from './components/MessageBubble';

// UI Translations
const TEXTS = {
  VN: {
    title: "SweetScout AI",
    subtitle: "Nghiên cứu & So sánh Thị trường",
    welcome_title: "Chào mừng bạn đến với SweetScout!",
    welcome_desc: "So sánh sản phẩm, phân tích hương vị và kiểm tra giá cả. Tải lên ảnh hoặc hỏi tôi bất cứ điều gì về bánh kẹo!",
    try_these: "Thử mẫu:",
    suggestions: [
      "So sánh bánh Chocopie và Custas",
      "Kẹo dẻo Haribo có những vị nào?",
      "Tìm hiểu về bánh Mochi Nhật Bản",
      "Review các loại snack rong biển"
    ],
    input_placeholder: "Hỏi về bánh kẹo...",
    input_placeholder_img: "Thêm chú thích...",
    disclaimer: "Gemini có thể đưa ra thông tin không chính xác. Hãy kiểm tra lại.",
    error_msg: "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
    comp_settings: "Tùy chọn so sánh",
    install_app: "Cài ứng dụng",
    install_guide_title: "Cài đặt ứng dụng",
    install_guide_android: "Nhấn vào biểu tượng 3 chấm ở góc phải trình duyệt -> Chọn 'Thêm vào màn hình chính' hoặc 'Cài đặt ứng dụng'.",
    install_guide_ios: "Nhấn vào nút Chia sẻ (Share) -> Chọn 'Thêm vào màn hình chính' (Add to Home Screen).",
    close: "Đóng",
    attrs: {
      product_image: "Hình ảnh",
      price: "Giá cả",
      flavor: "Hương vị",
      ingredients: "Thành phần",
      audience: "Khách hàng",
      reviews: "Đánh giá",
      pros_cons: "Ưu/Nhược điểm",
      product_profile: "Hồ sơ SP",
      social_reviews: "Đánh giá MXH"
    }
  },
  EN: {
    title: "SweetScout AI",
    subtitle: "Market Research & Comparisons",
    welcome_title: "Welcome to SweetScout!",
    welcome_desc: "Compare products, analyze flavors, and check prices. Upload a photo or ask me anything about candies and cakes!",
    try_these: "Try these:",
    suggestions: [
      "Compare Chocopie and Custas",
      "What flavors does Haribo have?",
      "Tell me about Japanese Mochi",
      "Review seaweed snacks"
    ],
    input_placeholder: "Ask about candies or cakes...",
    input_placeholder_img: "Add a caption...",
    disclaimer: "Gemini may display inaccurate info. Double-check its responses.",
    error_msg: "Sorry, I encountered an error while processing your request. Please try again.",
    comp_settings: "Comparison Options",
    install_app: "Install App",
    install_guide_title: "Install App",
    install_guide_android: "Tap the 3-dot menu -> Select 'Add to Home Screen' or 'Install App'.",
    install_guide_ios: "Tap the Share button -> Select 'Add to Home Screen'.",
    close: "Close",
    attrs: {
      product_image: "Image",
      price: "Price",
      flavor: "Flavor",
      ingredients: "Ingredients",
      audience: "Audience",
      reviews: "Reviews",
      pros_cons: "Pros/Cons",
      product_profile: "Profile",
      social_reviews: "Social Reviews"
    }
  },
  KR: {
    title: "SweetScout AI",
    subtitle: "시장 조사 및 비교",
    welcome_title: "SweetScout에 오신 것을 환영합니다!",
    welcome_desc: "제품을 비교하고 맛을 분석하며 가격을 확인하세요. 사진을 업로드하거나 사탕과 케이크에 대해 무엇이든 물어보세요!",
    try_these: "추천 질문:",
    suggestions: [
      "초코파이와 카스타드 비교",
      "하리보 젤리는 어떤 맛이 있나요?",
      "일본 모찌에 대해 알려줘",
      "김 스낵 리뷰"
    ],
    input_placeholder: "사탕이나 케이크에 대해 물어보세요...",
    input_placeholder_img: "캡션 추가...",
    disclaimer: "Gemini는 부정확한 정보를 표시할 수 있습니다. 다시 확인하세요.",
    error_msg: "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
    comp_settings: "비교 옵션",
    install_app: "앱 설치",
    install_guide_title: "앱 설치",
    install_guide_android: "메뉴 버튼(점 3개)을 탭하세요 -> '홈 화면에 추가' 또는 '앱 설치'를 선택하세요.",
    install_guide_ios: "공유 버튼을 탭하세요 -> '홈 화면에 추가'를 선택하세요.",
    close: "닫기",
    attrs: {
      product_image: "이미지",
      price: "가격",
      flavor: "맛/식감",
      ingredients: "성분",
      audience: "타겟 고객",
      reviews: "평점/리뷰",
      pros_cons: "장단점",
      product_profile: "프로필",
      social_reviews: "소셜 리뷰"
    }
  }
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('VN');
  
  // Comparison Attributes State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<ComparisonAttribute[]>([
    'product_image', 'price', 'flavor', 'ingredients', 'reviews', 'pros_cons', 'social_reviews'
  ]);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for auto-update logic
  const debounceTimeoutRef = useRef<any>(null);
  const isFirstRender = useRef(true);

  const T = TEXTS[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedImage, showSettings]);

  useEffect(() => {
    inputRef.current?.focus();
    
    // PWA Install Prompt Listener
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-regenerate response when settings or language change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only trigger if there is history, not currently loading, and the last message was from the model
    if (messages.length > 0 && !isLoading) {
       const lastMsg = messages[messages.length - 1];
       if (lastMsg.role === 'model') {
          if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
          
          debounceTimeoutRef.current = setTimeout(() => {
             handleRegenerateLastResponse();
          }, 600);
       }
    }
    
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [selectedAttributes, language]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Show manual instructions if prompt is not available
      setShowInstallHelp(true);
    }
  };

  const handleRegenerateLastResponse = async () => {
    if (messages.length === 0) return;
    
    setIsLoading(true);
    const botMessageId = messages[messages.length - 1].id;
    
    // Clear the text to indicate regeneration
    setMessages(prev => prev.map(msg => 
      msg.id === botMessageId ? { ...msg, text: '', isStreaming: true } : msg
    ));

    try {
      // Explicitly ask for regeneration with current context
      const updatePrompt = "Please regenerate the previous response. If it contained a comparison table, STRICTLY update the columns to match the current settings. If the language changed, translate the entire response.";
      
      await sendMessageStream(
        updatePrompt,
        null, // Context is maintained by session
        language,
        selectedAttributes,
        (textChunk, sources) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: textChunk, sources: sources } 
                : msg
            )
          );
      });
    } catch (error) {
      console.error("Failed to regenerate", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: T.error_msg } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        inputRef.current?.focus();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const toggleAttribute = (attr: ComparisonAttribute) => {
    setSelectedAttributes(prev => 
      prev.includes(attr) 
        ? prev.filter(a => a !== attr)
        : [...prev, attr]
    );
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    setSelectedImage(null); 
    setShowSettings(false); // Close settings on send

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      image: currentImage || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, botMessage]);

    try {
      await sendMessageStream(
        text, 
        currentImage, 
        language, 
        selectedAttributes,
        (textChunk, sources) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: textChunk, sources: sources } 
                : msg
            )
          );
      });
    } catch (error) {
      console.error("Failed to get response", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: T.error_msg } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-sugar-50 text-gray-800">
      {/* Hidden Inputs */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageSelect} className="hidden" />

      {/* Install Help Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-primary-800">{T.install_guide_title}</h3>
              <button onClick={() => setShowInstallHelp(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-bold text-gray-900 mb-1">Android (Chrome):</p>
                <p>{T.install_guide_android}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-bold text-gray-900 mb-1">iOS (Safari):</p>
                <p>{T.install_guide_ios}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInstallHelp(false)}
              className="w-full mt-6 bg-primary-600 text-white py-2 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
              {T.close}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-primary-100 px-4 md:px-6 py-4 shadow-sm z-10 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2 rounded-full">
            <span className="text-2xl">🍭</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{T.title}</h1>
            <p className="text-xs text-primary-600 font-medium hidden sm:block">{T.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* PWA Install Button - Always visible */}
          <button
            onClick={handleInstallClick}
            className="hidden md:flex items-center gap-1 bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {T.install_app}
          </button>
          
          {/* Mobile Install Icon */}
          <button
            onClick={handleInstallClick}
            className="md:hidden bg-primary-50 text-primary-600 p-1.5 rounded-lg border border-primary-100 hover:bg-primary-100"
            title={T.install_app}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-primary-50 p-1 rounded-lg border border-primary-100">
            {(['VN', 'EN', 'KR'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                disabled={isLoading}
                className={`
                  px-2 py-1 text-xs font-bold rounded-md transition-all duration-200
                  ${language === lang 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-primary-400 hover:text-primary-600 hover:bg-primary-100/50'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-primary-100 max-w-md">
                <div className="text-5xl mb-4 animate-bounce-slow">🧁</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{T.welcome_title}</h2>
                <p className="text-gray-600 mb-6">
                  {T.welcome_desc}
                </p>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 ml-1">{T.try_these}</p>
                  <div className="space-y-2">
                    {T.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(sug)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-800 text-sm transition-all border border-primary-100 hover:border-primary-200"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} language={language} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-6">
                  <div className="bg-white border border-primary-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                     <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                     <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                     <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-primary-100 p-4 sticky bottom-0 z-10 pb-6 md:pb-4">
        <div className="max-w-4xl mx-auto relative">
          
          {/* Settings Panel (Popover) */}
          {showSettings && (
            <div className="absolute bottom-full left-0 mb-3 w-full md:w-auto min-w-[300px] bg-white rounded-2xl shadow-xl border border-primary-200 p-4 animate-fade-in-up z-20">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-primary-800 text-sm">{T.comp_settings}</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(T.attrs) as ComparisonAttribute[]).map((attr) => (
                  <button
                    key={attr}
                    onClick={() => toggleAttribute(attr)}
                    disabled={isLoading}
                    className={`
                      text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2
                      ${selectedAttributes.includes(attr) 
                        ? 'bg-primary-50 border-primary-300 text-primary-700' 
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'}
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${selectedAttributes.includes(attr) ? 'bg-primary-500 border-primary-500' : 'border-gray-300 bg-white'}`}>
                       {selectedAttributes.includes(attr) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {T.attrs[attr]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-lg border border-primary-100 flex items-start gap-2 animate-fade-in-up">
              <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="bg-gray-100 hover:bg-gray-200 p-1 rounded-full text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-200 focus-within:border-primary-400 focus-within:bg-white transition-all">
            
            {/* Settings Toggle */}
             <button
              onClick={() => setShowSettings(!showSettings)}
              className={`
                p-2 rounded-xl transition-colors mb-[1px]
                ${showSettings ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}
              `}
              title="Comparison Settings"
              disabled={isLoading}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>

            {/* Camera Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors mb-[1px]"
              title="Take Photo"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors mb-[1px]"
              title="Upload Image"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={selectedImage ? T.input_placeholder_img : T.input_placeholder}
              disabled={isLoading}
              className="w-full p-2 bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 mb-1"
            />
            
            {/* Send Button */}
            <button
              onClick={() => handleSend(input)}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`
                p-2 rounded-xl transition-all duration-200 mb-[1px]
                ${(!input.trim() && !selectedImage) || isLoading 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:scale-105 active:scale-95'}
              `}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
          <div className="text-center mt-2">
             <p className="text-[10px] text-gray-400">{T.disclaimer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;