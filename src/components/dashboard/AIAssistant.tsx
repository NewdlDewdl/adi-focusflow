'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon } from '@radix-ui/react-icons';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AIAssistantProps {
  userContext: {
    streak: number;
    productivityScore: number;
    avgFocus: number;
    topDistraction: string;
    sessionsThisWeek: number;
    totalSessions: number;
    deepFocusPercentage: number;
  };
}

export function AIAssistant({ userContext }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hey! 👋 I'm your focus coach. I can see you have a ${userContext.streak}-day streak going - that's awesome! Ask me anything about improving your focus or let's dig into your analytics.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          userContext,
          history: messages
        })
      });

      const { message } = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: message }]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "Sorry, I'm having trouble connecting right now. Try again in a moment!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'How can I improve my focus?',
    'Why do I get distracted?',
    'What\'s my best time to work?'
  ];

  return (
    <div className="w-full h-full flex flex-col bg-warmSurface rounded-lg border border-warmBorder overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-warmBorder bg-warmBeige">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warmCoral to-warmCoralLight text-warmBeige flex items-center justify-center text-lg font-bold">
          AI
        </div>
        <div>
          <h3 className="font-semibold text-warmBrown">Focus Coach</h3>
          <div className="text-xs text-warmBrownMuted">
            Powered by Gemini
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-warmCoral text-warmBeige ml-8'
                  : 'bg-warmBeige text-warmBrown mr-8 border border-warmBorder'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-warmBeige text-warmBrown rounded-2xl px-4 py-2 border border-warmBorder">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-warmCoral rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-warmCoral rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-warmCoral rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInput(prompt)}
              className="text-xs px-3 py-1.5 rounded-full bg-warmBeige border border-warmBorder text-warmBrown hover:bg-warmSurface transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-warmBorder bg-warmBeige">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your focus patterns..."
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-full border border-warmBorder bg-warmSurface text-warmBrown placeholder:text-warmBrownMuted focus:outline-none focus:ring-2 focus:ring-warmCoral disabled:opacity-50"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="icon"
            className="rounded-full bg-warmCoral hover:bg-warmCoralLight text-warmBeige disabled:opacity-50"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
