
import React, { useMemo } from 'react';
import { Message, Language } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import ChartRenderer from './ChartRenderer';

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

  // Separate Text content from JSON Data if the API embedded it in the text
  // We want to remove ALL JSON blocks related to charts or export data from the visible text
  const { displayText, chartData, comparisonData } = useMemo(() => {
    // Use data passed from parent if available
    let cData = message.chartData;
    let compData = message.comparisonData;
    
    // Clean the text of known JSON blocks to prevent double rendering or ugly raw JSON
    // This regex matches any ```json ... ``` block that has "type": "bar"/"radar"/"comparison_data"
    const jsonBlockRegex = /```json\s*\{[\s\S]*?"type":\s*"(bar|radar|comparison_data)"[\s\S]*?\}\s*```/g;
    let cleanText = message.text.replace(jsonBlockRegex, '').trim();

    return { displayText: cleanText, chartData: cData, comparisonData: compData };
  }, [message.text, message.chartData, message.comparisonData]);

  const handleDownloadCSV = () => {
    if (!comparisonData) return;
    
    // Sanitize cell data: escape quotes and wrap in quotes if needed
    const escapeCsv = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      comparisonData.headers.map(escapeCsv).join(','),
      ...comparisonData.rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sweetscout_comparison_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (!comparisonData) return;
    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sweetscout_comparison_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        {/* Attached Image */}
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
            <p>{displayText}</p>
          ) : (
            <>
              <MarkdownRenderer content={displayText} />
              
              {/* Chart Rendering */}
              {chartData && (
                <div className="mt-4 animate-fade-in-up">
                  <ChartRenderer data={chartData} />
                </div>
              )}

              {/* Export Buttons */}
              {comparisonData && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase mr-2">Export Data:</span>
                  <button 
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    CSV
                  </button>
                  <button 
                    onClick={handleDownloadJSON}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    JSON
                  </button>
                </div>
              )}
            </>
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
