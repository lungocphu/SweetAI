import React from 'react';
import { Message, Language } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  language: Language;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, language }) => {
  const isUser = message.role === 'user';

  const sourcesLabel = {
    'VN': 'Nguồn tham khảo',
    'EN': 'Sources',
    'KR': '출처'
  }[language];

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`
          relative max-w-[98%] lg:max-w-[95%] rounded-2xl px-5 py-4 shadow-sm overflow-hidden
          ${isUser 
            ? 'bg-primary-600 text-white rounded-br-none' 
            : 'bg-white border border-primary-100 text-gray-800 rounded-bl-none'}
        `}
      >
        {/* Attached Image (User only mostly, but supports model too) */}
        {message.image && (
          <div className="mb-3 -mx-5 -mt-4">
            <img 
              src={message.image} 
              alt="Uploaded content" 
              className={`max-h-64 w-full object-cover ${isUser ? 'opacity-90' : ''}`} 
            />
          </div>
        )}

        {/* Message Content */}
        <div className={`text-sm md:text-base ${isUser ? 'text-white' : ''}`}>
          {isUser ? (
            <p>{message.text}</p>
          ) : (
            <MarkdownRenderer content={message.text} />
          )}
        </div>

        {/* Sources Section (Only for model) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {sourcesLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.web?.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                    bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors
                    border border-primary-200 truncate max-w-[200px]
                  "
                  title={source.web?.title}
                >
                  <span className="truncate">{source.web?.title || 'Web Source'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-[10px] mt-2 text-right opacity-70 ${isUser ? 'text-primary-100' : 'text-gray-400'}`}>
           {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;