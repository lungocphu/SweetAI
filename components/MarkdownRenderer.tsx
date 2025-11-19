import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  
  // Helper to parse inline content: Bold (**text**) and Images (![alt](url))
  const renderInlineContent = (text: string) => {
    // Regex matches:
    // Group 1: Image (![...](...))
    // Group 2: Bold (**...**)
    const parts = text.split(/(!\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g).filter(p => p !== undefined && p !== '');

    return parts.map((part, i) => {
      // Check Image
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <img 
            key={i} 
            src={imgMatch[2]} 
            alt={imgMatch[1]} 
            className="h-16 w-auto max-w-[100px] object-contain rounded-md border border-gray-200 bg-white mx-auto my-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      }

      // Check Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }

      return <span key={i}>{part}</span>;
    });
  };

  const processText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let inList = false;
    let listItems: React.ReactNode[] = [];
    
    let inTable = false;
    let tableRows: React.ReactNode[] = [];
    let tableHeader: React.ReactNode = null;

    const flushList = (keyPrefix: string) => {
       if (inList) {
           elements.push(<ul key={`ul-${keyPrefix}`} className="list-disc pl-5 mb-4 space-y-1">{listItems}</ul>);
           inList = false;
           listItems = [];
       }
    };

    const flushTable = (keyPrefix: string) => {
      if (inTable) {
        elements.push(
          <div key={`table-wrapper-${keyPrefix}`} className="overflow-x-auto mb-6 border border-primary-200 rounded-xl shadow-sm bg-white">
            <table className="min-w-full divide-y divide-primary-100 border-collapse">
              <thead>
                {tableHeader}
              </thead>
              <tbody className="divide-y divide-primary-100">
                {tableRows}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
        tableHeader = null;
      }
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // --- TABLE HANDLING ---
      if (line.trim().startsWith('|')) {
        flushList(idx.toString());
        
        const cells = line.split('|').filter((c, i, arr) => i !== 0 && i !== arr.length - 1).map(c => c.trim());
        
        if (!inTable) {
          // Assume first line is header
          inTable = true;
          tableHeader = (
            <tr key={`th-tr-${idx}`} className="bg-primary-50">
              {cells.map((cell, cellIdx) => (
                <th key={cellIdx} className="px-4 py-3 text-left text-xs font-bold text-primary-800 uppercase tracking-wider border-r border-primary-200 last:border-r-0 min-w-[200px] whitespace-normal">
                  {cell.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          );
          // Check if next line is separator line (---) and skip it
          if (idx + 1 < lines.length && lines[idx + 1].trim().includes('---')) {
            idx++; 
          }
        } else {
          // Data row
          const isEven = tableRows.length % 2 === 0;
          tableRows.push(
            <tr key={`td-tr-${idx}`} className={`${isEven ? 'bg-white' : 'bg-gray-50'} hover:bg-primary-50 transition-colors duration-150`}>
              {cells.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 text-gray-700 whitespace-normal align-top border-r border-gray-200 last:border-r-0 text-sm leading-relaxed min-w-[200px]">
                   {renderInlineContent(cell)}
                </td>
              ))}
            </tr>
          );
        }
        continue;
      } else {
        flushTable(idx.toString());
      }

      // --- HEADERS ---
      if (line.startsWith('### ')) {
        flushList(idx.toString());
        elements.push(<h3 key={idx} className="text-lg font-bold text-primary-800 mt-4 mb-2">{line.replace('### ', '')}</h3>);
        continue;
      }
      if (line.startsWith('## ')) {
        flushList(idx.toString());
        elements.push(<h2 key={idx} className="text-xl font-bold text-primary-900 mt-5 mb-2 border-b border-primary-100 pb-1">{line.replace('## ', '')}</h2>);
        continue;
      }

      // --- BOLD LINE (SUBHEADER) ---
      if (line.startsWith('**') && line.endsWith('**')) {
        flushList(idx.toString());
        elements.push(<div key={idx} className="font-bold text-gray-800 mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>);
        continue;
      }

      // --- LISTS ---
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        inList = true;
        const content = line.trim().substring(2);
        listItems.push(<li key={`li-${idx}`} className="text-gray-700 leading-relaxed">{renderInlineContent(content)}</li>);
        continue;
      }

      // --- PARAGRAPHS ---
      if (line.trim() !== '') {
        flushList(idx.toString());
        elements.push(<p key={idx} className="mb-2 text-gray-700 leading-relaxed">{renderInlineContent(line)}</p>);
      } else {
        // Empty line flushes list
        flushList(idx.toString());
      }
    }

    flushList('end');
    flushTable('end');

    return elements;
  };

  return <div className="prose prose-pink max-w-none">{processText(content)}</div>;
};

export default MarkdownRenderer;