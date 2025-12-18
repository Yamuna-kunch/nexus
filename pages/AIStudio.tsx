
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Bot, Play, Save, RotateCcw, Sparkles, MessageSquare } from 'lucide-react';
import { testAgentPrompt, suggestOptimizedPrompt } from '../services/geminiService';

const AIStudio: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState(`You are 'Alex', a helpful dental receptionist for 'Bright Smiles Dental'. 
Your goal is to schedule an appointment for the user.
Be polite, professional, and concise. 
Ask for their name and preferred date.`);
  
  // Use gemini-3-flash-preview as the default sandbox model.
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [temperature, setTemperature] = useState(0.7);
  const [testMessage, setTestMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleTest = async () => {
    if (!testMessage.trim()) return;

    const newHistory = [...chatHistory, { role: 'user' as const, text: testMessage }];
    setChatHistory(newHistory);
    setTestMessage('');
    setIsLoading(true);

    const response = await testAgentPrompt(model, systemPrompt, testMessage, temperature);
    
    setChatHistory([...newHistory, { role: 'assistant', text: response }]);
    setIsLoading(false);
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    const optimized = await suggestOptimizedPrompt(systemPrompt);
    setSystemPrompt(optimized);
    setIsOptimizing(false);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Studio</h1>
          <p className="text-slate-500">Tune your agent's personality and logic.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reset
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              <Save className="w-4 h-4" />
              Save Configuration
           </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 pb-2">
          <Card className="flex-1 flex flex-col">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                 <Bot className="w-4 h-4 text-indigo-500" />
                 System Prompt
               </h3>
               <button 
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 disabled:opacity-50">
                 <Sparkles className="w-3 h-3" />
                 {isOptimizing ? 'Optimizing...' : 'Auto-Optimize'}
               </button>
             </div>
             <div className="p-4 flex-1">
               <textarea 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-full min-h-[300px] resize-none border-0 focus:ring-0 text-slate-700 font-mono text-sm leading-relaxed"
                placeholder="Enter instructions here..."
               />
             </div>
          </Card>

          <Card title="Model Settings" className="shrink-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Model</label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent py-2.5"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (Fastest)</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro (Smartest)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Temperature: {temperature}</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600" 
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                   <span>Precise</span>
                   <span>Creative</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview / Sandbox */}
        <div className="flex flex-col h-full min-h-[500px]">
           <div className="bg-slate-900 rounded-t-xl p-4 flex items-center justify-between text-white">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
               <span className="text-sm font-medium">Test Sandbox</span>
             </div>
             <button onClick={() => setChatHistory([])} className="text-xs text-slate-400 hover:text-white">Clear</button>
           </div>
           <div className="flex-1 bg-slate-50 border-x border-slate-200 p-4 overflow-y-auto space-y-4">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <Bot className="w-12 h-12 mb-2" />
                  <p className="text-sm">Start the conversation...</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                 </div>
              )}
           </div>
           <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl p-3">
             <div className="relative">
               <input 
                type="text" 
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                placeholder="Type a message to simulate user..."
                className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-0 rounded-lg pr-12 py-3 pl-4 text-sm transition-all"
               />
               <button 
                onClick={handleTest}
                disabled={isLoading}
                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                 <Play className="w-4 h-4 fill-current" />
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
