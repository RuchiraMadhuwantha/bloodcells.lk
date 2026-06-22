import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Bot } from 'lucide-react';

export const SUGGESTED_PROMPTS = [
  'Am I eligible to donate now?',
  'Which blood groups are low this week?',
  'How do I raise an emergency request?',
  'Show nearest donation centers',
];

const cannedReply = (text) => {
  const t = text.toLowerCase();
  if (t.includes('eligible')) return 'Based on your last donation (Mar 12, 2026), you become eligible again on Jun 16, 2026 — that\'s today! You can book an appointment now.';
  if (t.includes('low') || t.includes('shortage')) return 'This week O− and B− are critically low (under 25% capacity). I\'d recommend prioritizing campaigns for these groups.';
  if (t.includes('emergency')) return 'Go to the Hospital Portal → New Blood Request, set Priority to "Emergency", and the request is broadcast instantly to all regional blood banks.';
  if (t.includes('center') || t.includes('near')) return 'Nearest centers: NBTS Colombo (2.1 km), Kurunegala RBC (4.8 km), Anuradhapura RBC (6.3 km). Want me to open the booking calendar?';
  return 'I can help with eligibility, appointments, emergency requests, inventory levels and demand forecasts. Try one of the suggested prompts below.';
};

export const FloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hi! I\'m PRAANA Assistant 🩸 — your AI helper for donations, requests and inventory. How can I help today?' },
  ]);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages(m => [...m, { from: 'user', text: value }]);
    setInput('');
    setTimeout(() => setMessages(m => [...m, { from: 'ai', text: cannedReply(value) }]), 450);
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[22rem] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: 520 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold leading-tight">PRAANA Assistant</p>
              <p className="text-xs text-white/80 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> Online · AI powered</p>
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'ai' && <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mr-2 shrink-0"><Bot className="w-4 h-4 text-red-600" /></div>}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white text-gray-700 shadow-sm rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Suggested prompts (quick actions) */}
          <div className="px-3 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)} className="whitespace-nowrap text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button onClick={() => send()} className="w-9 h-9 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
