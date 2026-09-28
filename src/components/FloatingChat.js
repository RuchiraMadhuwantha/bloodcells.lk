import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Bot, Info } from 'lucide-react';

export const SUGGESTED_PROMPTS = [
  'Am I eligible to donate now?',
  'Which blood groups are low this week?',
  'How do I raise an emergency request?',
  'Show nearest donation centers',
];

/**
 * Offline, rule-based helper. It is NOT connected to a language model and it
 * has no access to any user's records, so it must never state a personal
 * eligibility date, a real stock level or a real distance. Anything that
 * depends on live data is pointed at the signed-in portal instead.
 */
const cannedReply = (text) => {
  const t = text.toLowerCase();
  if (t.includes('eligible') || t.includes('eligibility')) {
    return "I can't see your donation history, so I can't tell you whether you're eligible — and I won't guess. Sign in to your Donor Dashboard, where your next eligible date is calculated from your own completed donations.";
  }
  if (t.includes('low') || t.includes('shortage') || t.includes('stock') || t.includes('inventory')) {
    return "Live stock levels aren't available to me. Signed-in Blood Bank staff can see real inventory and alerts on the Blood Bank Dashboard, and hospitals can request stock through the Hospital Portal.";
  }
  if (t.includes('emergency')) {
    return "To raise an emergency request: sign in to the Hospital Portal, choose \"New Blood Request\", set the priority to Emergency and the required date, then submit. It enters the Blood Bank approval queue straight away.";
  }
  if (t.includes('center') || t.includes('centre') || t.includes('near')) {
    return "The list of approved donation centres comes from the database. Sign in and use \"Book Appointment\" to see the centres that are currently active and book a real time slot.";
  }
  return "I can explain how eligibility, appointments, emergency requests and inventory work. I'm a demo assistant with fixed answers — for anything about your own records, use the signed-in dashboards. Try one of the suggested prompts below.";
};

export const FloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'ai', text: "Hi! I'm the BloodCells.lk assistant. I can explain how the service works — for your own records and live data, please use the signed-in dashboards." },
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
              <p className="font-semibold leading-tight">BloodCells.lk Assistant</p>
              <p className="text-xs text-white/80 flex items-center gap-1"><Info className="w-3 h-3" /> Demo · fixed answers, not live data</p>
            </div>
          </div>

          <div className="bg-amber-50 text-amber-900 text-[11px] px-4 py-2 border-b border-amber-100 leading-relaxed">
            This assistant is not connected to an AI model and cannot see your records, eligibility or
            real stock levels. Anything personal is shown only in your signed-in dashboard.
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
