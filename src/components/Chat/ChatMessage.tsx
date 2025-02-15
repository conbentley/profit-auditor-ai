
import { type ReactNode } from "react";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  children: ReactNode;
}

export function ChatMessage({ role, children }: ChatMessageProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          role === 'user'
            ? 'bg-primary text-primary-foreground ml-4'
            : 'bg-muted mr-4'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  );
}
