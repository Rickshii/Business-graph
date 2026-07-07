import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Bot, HelpCircle, Network, ArrowRight, Zap } from 'lucide-react';
import { api } from '../services/api';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  nodes?: any[];
  edges?: any[];
  suggestions?: string[];
}

const PROMPT_SUGGESTIONS = [
  { title: 'Influence Scores',        query: 'Who are the most influential nodes?' },
  { title: 'Circular Loops',          query: 'Run a fraud audit to find circular loops' },
  { title: 'Supply Chain Discovery',  query: 'Explain our suppliers and supply structure' },
  { title: 'Competitor Strengths',    query: 'Show brand competitor market share analysis' },
  { title: 'Strategic Alliances',     query: 'Predict potential partnership opportunities' },
];

export default function AIChat({ setTab, onHighlightNodes }: { setTab: (tab: string) => void; onHighlightNodes: (nodeIds: string[]) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hello! I am your **Knowledge Graph AI Agent**. I can run graph algorithms and queries directly on our database. Try asking:\n\n* *'Who are the most influential nodes?'*\n* *'Run a fraud audit to find circular loops'*\n* *'Recommend potential business partnerships'*",
      timestamp: new Date(),
      suggestions: ['Show PageRank influence', 'Show circular relationships', 'List active suppliers']
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userMsg: Message = { sender: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { prompt: textToSend });
      setMessages(prev => [...prev, { sender: 'bot', text: res.data.answer, timestamp: new Date(), nodes: res.data.nodes, edges: res.data.edges, suggestions: res.data.suggestions }]);
    } catch (error) {
      console.warn('Backend offline — generating local mock bot reply.');
      const query = textToSend.toLowerCase();
      let replyText = '';
      let replyNodes: any[] = [];
      let suggestions: string[] = [];

      if (query.includes('influence') || query.includes('pagerank')) {
        replyText = "Based on the PageRank algorithm run on the current dataset, here are the most influential nodes:\n\n1. **Apex Tech Solutions** (score: 28.4%)\n2. **Priya Sharma** (score: 22.1%)\n3. **Nova Retail Group** (score: 18.7%)\n\nApex Tech Solutions acts as a central hub due to strong customer purchasing links.";
        replyNodes = [{ id: 'n1' }, { id: 'n4' }, { id: 'n2' }];
        suggestions = ['Show circular loops', 'List active suppliers'];
      } else if (query.includes('loop') || query.includes('cycle') || query.includes('fraud')) {
        replyText = "I completed the Fraud Detection scan. A suspect circular relationship cycle was detected: **Apex Tech Solutions** ↔ **CloudBase Systems**.\n\nThis pattern may suggest transaction loops, review collusion rings, or circular supply chain inflation. Recommended action: inspect contract properties.";
        replyNodes = [{ id: 'n1' }, { id: 'n3' }];
        suggestions = ['Show PageRank influence', 'List active suppliers'];
      } else if (query.includes('supplier') || query.includes('supply')) {
        replyText = "Our current supply chain is comprised of three key suppliers:\n\n* **CloudBase Systems** (supplies cloud infrastructure to Apex Tech Solutions, SLA 99.9%)\n* **SwiftLogistics Ltd** (supplies logistics services to Nova Retail Group, SLA 97%)\n* **Prime Parts Co.** (supplies hardware components to Apex Tech Solutions, SLA 98.5%)\n\nYou can inspect these supply links in the Graph Explorer.";
        replyNodes = [{ id: 'n3' }, { id: 'n7' }, { id: 'n12' }];
        suggestions = ['Show competitor market share', 'Recommend alliances'];
      } else if (query.includes('competitor') || query.includes('dominance') || query.includes('share') || query.includes('market')) {
        replyText = "Based on direct BUYS_FROM customer relations, competitor market share stands at:\n\n* **Apex Tech Solutions** (68%)\n* **Nova Retail Group** (48%)\n* **OmniCorp Industries** (31%)\n* **DataEdge Corp** (22%)\n\nApex Tech dominates the Tech vertical, while Nova Retail holds the majority in Retail.";
        replyNodes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n9' }, { id: 'n5' }];
        suggestions = ['Recommend alliances', 'Show PageRank influence'];
      } else if (query.includes('alliance') || query.includes('partnership') || query.includes('recommend')) {
        replyText = "The Jaccard Similarity engine recommends the following partnership matches:\n\n1. **Apex Tech Solutions ↔ Nova Retail Group** (85% match strength, common links: Priya Sharma, CloudBase Systems)\n2. **Jordan Ali ↔ Maya Chen** (40% match strength, common link: Priya Sharma)\n\nEstablishing alliances between these entities is highly recommended to optimize cross-selling.";
        replyNodes = [{ id: 'n1' }, { id: 'n2' }];
        suggestions = ['Show PageRank influence', 'Show circular loops'];
      } else {
        replyText = "I am ready to assist you offline. I can retrieve details from our cached Knowledge Graph. Try asking about *influential nodes*, *circular transaction loops*, *suppliers*, *market share*, or *partnership alliances*.";
        suggestions = ['Show PageRank influence', 'Show circular loops', 'List active suppliers'];
      }

      setMessages(prev => [...prev, { sender: 'bot', text: replyText, timestamp: new Date(), nodes: replyNodes, suggestions }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 animate-slide-up h-auto lg:h-[calc(100vh-160px)]">
      {/* Chat Window */}
      <div className="h-[60vh] lg:h-full flex-grow card flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-display">Knowledge Graph QA</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                <p className="text-[10px] text-slate-400 font-semibold">Powered by Graph AI Agents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-slate-50/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              {msg.sender === 'bot' ? (
                <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 h-9 w-9 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
              ) : (
                <div className="p-2 rounded-2xl bg-slate-100 text-slate-500 h-9 w-9 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
              )}
              <div className="space-y-2.5">
                <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white shadow-soft-sm'
                    : 'bg-white border border-slate-100 text-slate-700 shadow-soft-sm'
                }`}>
                  {msg.text.split('\n').map((para, pIdx) => {
                    let formatted = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                    if (para.startsWith('### ')) return <h4 key={pIdx} className="text-sm font-bold text-slate-900 mt-2 mb-1.5 font-display" dangerouslySetInnerHTML={{ __html: formatted.replace('### ', '') }} />;
                    if (para.startsWith('- ') || para.startsWith('* ')) return <li key={pIdx} className="ml-4 list-disc mt-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} />;
                    return <p key={pIdx} className="mt-1.5 first:mt-0" dangerouslySetInnerHTML={{ __html: formatted }} />;
                  })}
                </div>
                {msg.nodes && msg.nodes.length > 0 && (
                  <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between text-xs shadow-soft-sm">
                    <div className="flex items-center gap-2 text-slate-600 font-semibold">
                      <Network size={14} className="text-indigo-500" />
                      <span>Found {msg.nodes.length} matching entities</span>
                    </div>
                    <button onClick={() => { setTab('explorer'); onHighlightNodes(msg.nodes!.map(n => n.id)); }} className="btn-primary !py-1 !px-2.5 text-xs !rounded-lg">
                      Map Nodes <ArrowRight size={12} />
                    </button>
                  </div>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button key={sIdx} onClick={() => handleSend(sug)}
                        className="bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200">
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-lg">
              <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 h-9 w-9 flex items-center justify-center shrink-0 animate-pulse"><Bot size={16} /></div>
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-soft-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask AI — 'Who is the most influential node?' or 'Run PageRank'"
            className="input !py-3 flex-grow"
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary !p-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Sidebar — Query Suggestions */}
      <div className="w-full lg:w-72 card p-5 h-auto lg:h-full lg:overflow-y-auto space-y-5 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 mb-2">
            <HelpCircle size={14} className="text-indigo-500" /> Query Suggestions
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The AI Chat understands natural language requests and converts them into operational Graph queries.
          </p>
        </div>

        <div className="space-y-2">
          {PROMPT_SUGGESTIONS.map((prompt, index) => (
            <button key={index} onClick={() => handleSend(prompt.query)}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-soft-sm">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={10} className="text-indigo-500" />
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{prompt.title}</span>
              </div>
              <div className="text-xs text-slate-600 font-medium truncate">{prompt.query}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
