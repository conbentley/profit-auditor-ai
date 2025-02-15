
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface ChatInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({ query, setQuery, onSend, isLoading }: ChatInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Ask about your financial performance..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={isLoading}
      />
      <Button
        onClick={onSend}
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
