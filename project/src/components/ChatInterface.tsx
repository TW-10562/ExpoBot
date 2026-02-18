import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Globe } from 'lucide-react';
import { Message } from '../types';

interface ChatInterfaceProps {
  onSaveToHistory: (query: string, answer: string, source: any) => void;
}

export default function ChatInterface({ onSaveToHistory }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your HR Policy Assistant. I can help you with questions about company policies, benefits, leave, remote work, and more. You can ask in English or Japanese (日本語でも質問できます).',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (query: string): { answer: string; source: any } => {
    const responses = [
      {
        keywords: ['leave', 'vacation', '休暇', '有給'],
        answer:
          'Employees are entitled to 15 days of annual leave per year. Leave must be requested at least 2 weeks in advance through the HR portal. Unused leave can be carried forward up to 5 days to the next year. Leave approval is subject to manager discretion and team workload.',
        source: {
          document: 'HR_Policy_Manual_2024.pdf',
          page: 12,
          language: 'English/Japanese',
        },
      },
      {
        keywords: ['remote', 'work from home', 'リモート', 'テレワーク'],
        answer:
          'Remote work is permitted up to 3 days per week with prior manager approval. You must ensure a stable internet connection and comply with security policies. All remote work must be logged in the attendance system. Equipment support is available for home office setup.',
        source: {
          document: 'Remote_Work_Guidelines_2024.pdf',
          page: 3,
          language: 'English/Japanese',
        },
      },
      {
        keywords: ['expense', '経費', '費用', 'reimbursement'],
        answer:
          'Expense reports must be submitted within 30 days of the expense date. Use the online finance portal to upload receipts and complete the expense form. Manager approval is required for expenses over $500. Reimbursement is processed within 10 business days of approval.',
        source: {
          document: 'Finance_Procedures.pdf',
          page: 8,
          language: 'English',
        },
      },
      {
        keywords: ['health', 'insurance', '健康', '保険', 'medical'],
        answer:
          'All full-time employees are eligible for comprehensive health insurance coverage starting from day one. The plan includes medical, dental, and vision coverage. Dependents can be added within 30 days of hire. Annual health checkups are provided free of charge at designated clinics.',
        source: {
          document: 'Benefits_Guide_2024.pdf',
          page: 5,
          language: 'English/Japanese',
        },
      },
    ];

    const lowerQuery = query.toLowerCase();
    const matchedResponse = responses.find((r) =>
      r.keywords.some((keyword) => lowerQuery.includes(keyword))
    );

    if (matchedResponse) {
      return matchedResponse;
    }

    return {
      answer:
        'Thank you for your question. Based on our HR policy database, I recommend contacting your HR representative directly for specific guidance on this matter. You can reach the HR team at hr@company.com or visit the HR office during business hours (9 AM - 5 PM).',
      source: {
        document: 'General_HR_Contact_Info.pdf',
        page: 1,
        language: 'English',
      },
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { answer, source } = generateResponse(input);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: answer,
        timestamp: new Date(),
        source,
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);

      onSaveToHistory(input, answer, source);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            } animate-fadeIn`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.type === 'user'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              }`}
            >
              {message.type === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            <div
              className={`flex-1 max-w-[80%] ${
                message.type === 'user' ? 'items-end' : 'items-start'
              } flex flex-col gap-2`}
            >
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {message.source && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs text-slate-300 border border-white/10">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {message.source.document} • Page {message.source.page}
                  </span>
                  <Globe className="w-3.5 h-3.5 ml-1" />
                  <span>{message.source.language}</span>
                </div>
              )}

              <span className="text-xs text-slate-400 px-2">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fadeIn">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-white/10 bg-black/20">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about HR policies in English or Japanese..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
