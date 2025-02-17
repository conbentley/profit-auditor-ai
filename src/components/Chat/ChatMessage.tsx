
import { type ReactNode } from "react";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  children: ReactNode;
}

export function ChatMessage({ role, children }: ChatMessageProps) {
  // Function to format message text with bold and bullet points
  const formatMessage = (text: string) => {
    if (role !== 'assistant') return text;

    // Split by double newlines to preserve paragraph spacing
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      const lines = paragraph.split('\n');
      
      return (
        <div key={pIndex} className="mb-4">
          {lines.map((line, index) => {
            // Format bold text wrapped in ** or __
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/__(.*?)__/g, '<strong>$1</strong>');

            // Format bullet points
            if (line.startsWith('- ')) {
              return (
                <li key={index} className="ml-4">
                  <span dangerouslySetInnerHTML={{ __html: line.substring(2) }} />
                </li>
              );
            }

            // Format headers (###)
            if (line.startsWith('### ')) {
              return (
                <h3 key={index} className="font-semibold text-lg mb-2">
                  <span dangerouslySetInnerHTML={{ __html: line.substring(4) }} />
                </h3>
              );
            }

            return (
              <div key={index} dangerouslySetInnerHTML={{ __html: line }} />
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
