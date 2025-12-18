
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { GHLService } from '../services/ghlService';
import { StorageService } from '../services/storageService';
import { ConnectedAccount } from '../types';
import { Workflow, AlertCircle, Webhook, Loader2, MapPin, Plus, Trash2, Zap, ArrowUpRight, Server, Code, Copy, Check, Save } from 'lucide-react';

const Integrations: React.FC = () => {
  // GHL State
  const [ghlKey, setGhlKey] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [isGhlConnecting, setIsGhlConnecting] = useState(false);
  const [ghlError, setGhlError] = useState('');
  const [isGhlDemoMode, setIsGhlDemoMode] = useState(true);
  
  // List of connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);

  // Backend / Make URL State
  const [backendUrl, setBackendUrl] = useState('');
  const [makeUrl, setMakeUrl] = useState('');
  const [isSavedBackend, setIsSavedBackend] = useState(false);
  const [isSavedMake, setIsSavedMake] = useState(false);

  // Load accounts & settings on mount
  useEffect(() => {
    setConnectedAccounts(StorageService.getAccounts());
    setBackendUrl(StorageService.getBackendUrl());
    setMakeUrl(StorageService.getMakeWebhook());
  }, []);

  const handleSaveBackend = () => {
      StorageService.saveBackendUrl(backendUrl);
      setIsSavedBackend(true);
      setTimeout(() => setIsSavedBackend(false), 2000);
  };

  const handleSaveMake = () => {
      StorageService.saveMakeWebhook(makeUrl);
      setIsSavedMake(true);
      setTimeout(() => setIsSavedMake(false), 2000);
  };

  const handleConnectAccount = async () => {
    if (!ghlKey || !ghlLocationId) {
        setGhlError("Please provide both Access Token and Location ID.");
        return;
    }

    if (connectedAccounts.some(acc => acc.locationId === ghlLocationId)) {
        setGhlError("This location ID is already connected.");
        return;
    }

    setIsGhlConnecting(true);
    setGhlError('');

    try {
        const locationDetails = await GHLService.getLocation(ghlKey, ghlLocationId, isGhlDemoMode);
        
        const newAccount: ConnectedAccount = {
            id: crypto.randomUUID(),
            locationId: locationDetails.id,
            locationName: locationDetails.name,
            apiKey: ghlKey,
            connectedAt: new Date().toISOString(),
            isDemo: isGhlDemoMode 
        };

        const updatedList = [...connectedAccounts, newAccount];
        setConnectedAccounts(updatedList);
        StorageService.saveAccount(newAccount);
        
        setGhlKey('');
        setGhlLocationId('');
    } catch (err: any) {
        setGhlError(err.message);
    } finally {
        setIsGhlConnecting(false);
    }
  };

  const handleDisconnect = (id: string) => {
    StorageService.removeAccount(id);
    setConnectedAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const handleTestAccount = async (account: ConnectedAccount) => {
    setTestingAccountId(account.id);
    try {
        await GHLService.createTestContact(account.apiKey, account.locationId, account.isDemo);
        
        const updatedAccount: ConnectedAccount = { 
            ...account, 
            lastTestStatus: 'success', 
            lastTestMessage: 'Contact created successfully' 
        };
        
        StorageService.saveAccount(updatedAccount);
        setConnectedAccounts(prev => prev.map(acc => acc.id === account.id ? updatedAccount : acc));
    } catch (err: any) {
        const updatedAccount: ConnectedAccount = { 
            ...account, 
            lastTestStatus: 'error', 
            lastTestMessage: err.message 
        };
        
        StorageService.saveAccount(updatedAccount);
        setConnectedAccounts(prev => prev.map(acc => acc.id === account.id ? updatedAccount : acc));
    } finally {
        setTestingAccountId(null);
    }
  };

  const SERVER_CODE = `
/**
 * NEXUSVOICE AI CALL SERVER (Node.js + Express)
 * This server connects Gemini AI with ElevenLabs for "Actual AI" voice on calls.
 * 
 * SETUP:
 * 1. npm install express body-parser cookie-parser twilio @google/genai axios
 * 2. Set Env Vars: API_KEY, ELEVEN_LABS_KEY
 */

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { GoogleGenAI } = require("@google/genai");
const Twilio = require('twilio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/audio', express.static('temp_audio'));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY; // Guidelines: Use process.env.API_KEY
const ELEVEN_KEY = process.env.ELEVEN_LABS_KEY;

async function generateAIVoice(text, voiceId, callSid) {
    const url = \`https://api.elevenlabs.io/v1/text-to-speech/\${voiceId}\`;
    const response = await axios({
        method: 'post',
        url: url,
        data: { text: text, model_id: "eleven_multilingual_v2" },
        headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer'
    });
    
    const filename = \`\${callSid}_\${Date.now()}.mp3\`;
    const filepath = path.join(__dirname, 'temp_audio', filename);
    if (!fs.existsSync('temp_audio')) fs.mkdirSync('temp_audio');
    fs.writeFileSync(filepath, response.data);
    
    return \`https://\${process.env.PUBLIC_DOMAIN}/audio/\${filename}\`;
}

app.post('/nexus-agent', async (req, res) => {
    const twiml = new Twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    
    const systemPrompt = req.query.prompt || req.cookies.systemPrompt || "You are a helpful assistant.";
    const voiceId = req.query.voiceId || req.cookies.voiceId || "pNInz6obpg8n9I4mqCba";
    const temperature = parseFloat(req.query.temperature || 0.7);
    let history = req.cookies.history ? JSON.parse(req.cookies.history) : [];

    if (!req.body.SpeechResult) {
        const greeting = req.query.firstSentence || "Hello!";
        const audioUrl = await generateAIVoice(greeting, voiceId, callSid);
        
        twiml.play(audioUrl);
        twiml.gather({ input: 'speech', action: req.originalUrl, method: 'POST', speechTimeout: 'auto' });

        res.cookie('systemPrompt', systemPrompt);
        res.cookie('voiceId', voiceId);
        res.cookie('history', JSON.stringify(history));
        res.type('text/xml');
        return res.send(twiml.toString());
    }

    const userSpeech = req.body.SpeechResult;
    // Guidelines: Always initialize with process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
        history.push({ role: "user", parts: [{ text: userSpeech }] });
        
        const response = await ai.models.generateContent({
            // Guidelines: gemini-3-flash-preview for text tasks.
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: \`SYSTEM: \${systemPrompt}\\n\\nUSER: \${userSpeech}\` }] },
            config: { temperature: temperature }
        });

        const aiText = response.text; // Access .text directly
        history.push({ role: "model", parts: [{ text: aiText }] });

        const audioUrl = await generateAIVoice(aiText, voiceId, callSid);
        
        twiml.play(audioUrl);
        twiml.gather({ input: 'speech', action: req.originalUrl, method: 'POST', speechTimeout: 'auto' });

        if (history.length > 10) history = history.slice(-10);
        res.cookie('history', JSON.stringify(history));
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (err) {
        twiml.say("System error. Reconnecting.");
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

app.listen(PORT, () => console.log(\`NexusVoice AI Server live on \${PORT}\`));
  `.trim();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500">Connect NexusVoice to your external CRM and workflows.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column: Outbound Triggers */}
        <div className="space-y-8">
            
            {/* Make.com Config */}
            <Card className="border-purple-200 shadow-md">
                <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#6f42c1] rounded-lg text-white shadow-sm">
                            <Workflow className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Make.com / Webhook</h3>
                            <p className="text-xs text-slate-500">Trigger outbound calls via Make (Integromat).</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        When you click <strong>"Simulate Webhook"</strong> in the Agents tab, we will send structured JSON to this URL.
                    </p>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Make.com Webhook URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={makeUrl}
                                onChange={(e) => setMakeUrl(e.target.value)}
                                placeholder="https://hook.us1.make.com/..."
                                className="flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 py-2.5 px-3 font-mono text-sm"
                            />
                            <button 
                                onClick={handleSaveMake}
                                className={`px-4 py-2 rounded-lg font-medium text-white transition-all flex items-center gap-2 ${isSavedMake ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {isSavedMake ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isSavedMake ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>
                    <div className="text-xs bg-slate-50 p-3 rounded text-slate-500 border border-slate-100">
                        <strong>Mapping:</strong> Make.com will now see fields like <code>firstName</code>, <code>phone</code>, <code>prompt</code>, and <code>voice</code>.
                    </div>
                </div>
            </Card>

            {/* Custom Server Config */}
            <Card className="border-indigo-200 shadow-md">
                <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
                            <Code className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Custom Node.js Server</h3>
                            <p className="text-xs text-slate-500">Enable "Actual AI" voice and consistent personality.</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 space-y-6 flex-1">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                        <div className="flex items-start gap-2">
                            <Server className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>This code ensures the AI speaks with high-quality voices and <strong>never forgets its prompt</strong> during the conversation.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Server URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={backendUrl}
                                onChange={(e) => setBackendUrl(e.target.value)}
                                placeholder="https://my-ai-server.onrender.com"
                                className="flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3 font-mono text-sm"
                            />
                            <button 
                                onClick={handleSaveBackend}
                                className={`px-4 py-2 rounded-lg font-medium text-white transition-all flex items-center gap-2 ${isSavedBackend ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {isSavedBackend ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isSavedBackend ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Code className="w-4 h-4 text-slate-500" /> Production Node.js Snippet
                            </h4>
                            <button 
                                onClick={() => navigator.clipboard.writeText(SERVER_CODE)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded transition-colors"
                            >
                                <Copy className="w-3 h-3" /> Copy
                            </button>
                        </div>
                        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner group">
                            <pre className="p-4 text-xs font-mono text-blue-200 overflow-x-auto h-[350px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {SERVER_CODE}
                            </pre>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        {/* Right Column: GoHighLevel (Existing) */}
        <Card className="relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Workflow className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 bg-[#1a73e8] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
                GHL
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-900">GoHighLevel (V2 API)</h3>
               <p className="text-sm text-slate-500">Connect multiple sub-accounts.</p>
             </div>
          </div>
          
          <div className="space-y-6 flex-1">
            
            {/* Connection Form */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add New Account
                </h4>
                
                <div className="space-y-3">
                    <div>
                        <input 
                            type="password" 
                            value={ghlKey}
                            onChange={(e) => setGhlKey(e.target.value)}
                            placeholder="Access Token (Bearer)"
                            className="w-full border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent py-2 px-3 transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            value={ghlLocationId}
                            onChange={(e) => setGhlLocationId(e.target.value)}
                            placeholder="Location ID (e.g. ve9EPM...)"
                            className="w-full border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent py-2 pl-9 pr-3 transition-colors"
                        />
                    </div>
                </div>

                {/* Demo Mode Toggle */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isGhlDemoMode} 
                                onChange={e => setIsGhlDemoMode(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                        </label>
                        <span className="text-xs text-slate-500">Demo Mode</span>
                    </div>

                    <button 
                        onClick={handleConnectAccount}
                        disabled={isGhlConnecting || !ghlKey || !ghlLocationId}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isGhlConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                    </button>
                </div>

                {ghlError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="break-words">{ghlError}</span>
                    </div>
                )}
            </div>

            {/* Connected Accounts List */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Connected Accounts ({connectedAccounts.length})</h4>
                
                {connectedAccounts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                        <Workflow className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No accounts connected yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {connectedAccounts.map((account) => (
                            <div key={account.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-200 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h5 className="font-bold text-slate-800 text-sm">{account.locationName}</h5>
                                        <p className="text-xs text-slate-500 font-mono">{account.locationId}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-xs font-medium text-emerald-600">Active</span>
                                        {account.isDemo && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded ml-1">Demo</span>}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleTestAccount(account)}
                                            disabled={testingAccountId === account.id}
                                            className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                        >
                                            {testingAccountId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                            Test
                                        </button>
                                        
                                        {account.lastTestStatus && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                account.lastTestStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {account.lastTestStatus === 'success' ? 'Verified' : 'Failed'}
                                            </span>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => handleDisconnect(account.id)}
                                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Disconnect"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

          </div>
        </Card>
      </div>

      <Card title="Integration Logs">
         <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-3 font-semibold text-slate-600">Event</th>
                   <th className="px-6 py-3 font-semibold text-slate-600">Destination</th>
                   <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                   <th className="px-6 py-3 font-semibold text-slate-600">Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {connectedAccounts.filter(a => a.lastTestStatus === 'success').map((acc) => (
                      <tr key={acc.id + 'log'} className="bg-emerald-50/50 animate-in fade-in">
                        <td className="px-6 py-3 font-medium text-slate-900">contact.created (Test)</td>
                        <td className="px-6 py-3 text-slate-500">GHL: {acc.locationName}</td>
                        <td className="px-6 py-3"><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Success (201)</span></td>
                        <td className="px-6 py-3 text-slate-500">Just now</td>
                      </tr>
                  ))}
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-900">call.completed</td>
                    <td className="px-6 py-3 text-slate-500">GHL V2</td>
                    <td className="px-6 py-3"><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Success (200)</span></td>
                    <td className="px-6 py-3 text-slate-500">2 mins ago</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-medium text-slate-900">contact.created</td>
                    <td className="px-6 py-3 text-slate-500">GHL V2</td>
                    <td className="px-6 py-3"><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Success (201)</span></td>
                    <td className="px-6 py-3 text-slate-500">1 hour ago</td>
                  </tr>
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
};

export default Integrations;
