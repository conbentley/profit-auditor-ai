
import { type ReactNode } from "react";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  children: ReactNode;
}

export function ChatMessage({ role, children }: ChatMessageProps) {
  // Function to format message text with bold and bullet points
  const formatMessage = (text: string) => {
    if (role !== 'assistant') return text;

    // Pre-process the text to handle markdown-style formatting
    text = text.replace(/##\s+([^#\n]+)/g, '$1');  // Remove ## and keep the text
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove ** and keep the text

    // Remove recommendations section entirely
    text = text.replace(/5\.\s*Recommendations[\s\S]*?(?=6\.|$)/, '');

    // Split by double newlines to preserve paragraph spacing
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      const lines = paragraph.split('\n');
      
      return (
        <div key={pIndex} className="mb-4">
          {lines.map((line, index) => {
            // Remove any remaining markdown symbols
            line = line.replace(/[#*]/g, '');

            // Format numbers at start of line (e.g. "1.", "2.", etc)
            if (line.match(/^\d+\.\s/)) {
              const [num, ...rest] = line.split(/\.(.+)/)
              return (
                <div key={index} className="font-semibold mb-2">
                  {num}. {rest.join('.')}
                </div>
              );
            }

            // Format bullet points with label-value pairs
            if (line.startsWith('- ')) {
              const content = line.substring(2);
              const labelMatch = content.match(/^([^:]+):\s*(.+)$/);
              if (labelMatch) {
                return (
                  <li key={index} className="ml-4 mb-2">
                    <span className="font-semibold">{labelMatch[1]}:</span> {labelMatch[2]}
                  </li>
                );
              }
              return <li key={index} className="ml-4 mb-2">{content}</li>;
            }

            // Format section headers
            if (line.includes('KPI Analysis:')) {
              return (
                <div key={index} className="font-semibold mb-2">
                  {line}
                </div>
              );
            }

            // Format main headers
            if (line.includes('Business Audit Report') || line.includes('Analysis Summary')) {
              return (
                <div key={index} className="font-semibold mb-2">
                  {line.trim()}
                </div>
              );
            }

            // Format currency values
            line = line.replace(/\$\d{1,3}(,\d{3})*(\.\d+)?/g, match => `<span class="font-semibold">${match}</span>`);
            
            // Format percentage values
            line = line.replace(/\d+(\.\d+)?%/g, match => `<span class="font-semibold">${match}</span>`);

            return (
              <div key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: line.trim() }} />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          role === 'user'
            ? 'bg-primary text-primary-foreground ml-4'
            : 'bg-muted mr-4'
        }`}
      >
        {typeof children === 'string' ? (
          <div className="text-sm space-y-1">
            {formatMessage(children)}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{children}</p>
        )}
      </div>
    </div>
  );
}
