
import React, { useState, useEffect, useRef } from 'react';
import { Agent, AgentFolder, ConnectedAccount, PhoneNumber, GHLCustomField, GHLTag, TriggerPayload, VoiceProfile } from '../types';
import { StorageService } from '../services/storageService';
import { TwilioService, mapVoiceIdToTwilio } from '../services/twilioService';
import { ElevenLabsService } from '../services/elevenLabsService';
import { testAgentPrompt, suggestOptimizedPrompt, chatWithAgent } from '../services/geminiService';
import { GHLService } from '../services/ghlService';
import { 
  Plus, 
  Bot, 
  Power, 
  Edit2, 
  Trash2, 
  Folder, 
  FolderPlus, 
  Layers, 
  Filter, 
  X,
  Building,
  Save,
  BrainCircuit,
  Phone,
  Workflow,
  Sparkles,
  Copy,
  Check,
  Play,
  PhoneCall,
  Sliders,
  Volume2,
  Mic,
  MicOff,
  ChevronDown,
  Pencil,
  MessageSquare,
  Database,
  Tag,
  Loader2,
  AlertCircle,
  Zap,
  Send,
  UploadCloud,
  FileAudio,
  StopCircle
} from 'lucide-react';

// --- COMPONENT: Styled Select ---
interface StyledSelectProps {
    label?: string;
    value: string | undefined;
    onChange: (val: string) => void;
    options: { value: string; label: string; subLabel?: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const StyledSelect: React.FC<StyledSelectProps> = ({ label, value, onChange, options, placeholder = "Select...", className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center shadow-sm transition-colors ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:border-indigo-300'}`}
            >
                <div className="flex flex-col items-start truncate pr-2 w-full">
                    <span className={`block truncate w-full ${!value ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.subLabel && (
                        <span className="text-xs text-slate-400">{selectedOption.subLabel}</span>
                    )}
                </div>
                {!disabled && <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-[100] mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 text-sm overflow-auto ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                    {options.length === 0 ? (
                         <div className="py-3 px-3 text-slate-400 text-center italic text-xs">No options available</div>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={`cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-indigo-50 transition-colors ${option.value === value ? 'bg-indigo-50/50' : ''}`}
                            >
                                <span className={`block truncate ${option.value === value ? 'font-medium text-indigo-900' : 'text-slate-900'}`}>
                                    {option.label}
                                </span>
                                {option.subLabel && (
                                    <span className="block text-xs text-slate-400 mt-0.5">{option.subLabel}</span>
                                )}
                                {option.value === value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600">
                                        <Check className="w-4 h-4" />
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};


// --- COMPONENT: Test Call Modal ---
const TestCallModal = ({ agent, onClose, allVoices }: { agent: Agent, onClose: () => void, allVoices: VoiceProfile[] }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [transcript, setTranscript] = useState<{role: 'user' | 'agent', text: string}[]>([]);
  const transcriptRef = useRef<{role: 'user' | 'agent', text: string}[]>([]);
  const isCallActiveRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [currentInterim, setCurrentInterim] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentInterim, isProcessing]);

  useEffect(() => {
    isCallActiveRef.current = true;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true; 
        recognitionRef.current.lang = agent.transcriptionLanguage || 'en-US';
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => {
             setIsListening(false);
             if (isCallActiveRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
                 try { recognitionRef.current.start(); } catch(e) {}
             }
        };
        recognitionRef.current.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                alert("Microphone access denied.");
            }
        };
        recognitionRef.current.onresult = async (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            if (interimTranscript) setCurrentInterim(interimTranscript);
            if (finalTranscript) {
                setCurrentInterim('');
                startProcessing(finalTranscript);
            }
        };
    }
    const timer = setTimeout(() => {
        setStatus('connected');
        if (agent.firstSentence) handleAgentSpeak(agent.firstSentence);
        else startListening();
    }, 1000);
    return () => {
        isCallActiveRef.current = false;
        clearTimeout(timer);
        if (recognitionRef.current) recognitionRef.current.abort();
        synthRef.current.cancel();
        if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const updateTranscript = (entry: {role: 'user' | 'agent', text: string}) => {
      setTranscript(prev => {
          const updated = [...prev, entry];
          transcriptRef.current = updated; 
          return updated;
      });
  };

  const startListening = () => {
      if (recognitionRef.current && isCallActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
      }
  };

  const startProcessing = async (text: string) => {
      isProcessingRef.current = true;
      setIsProcessing(true);
      if (recognitionRef.current) recognitionRef.current.stop();
      updateTranscript({ role: 'user', text });
      // Guideline fix: history parts are an array of objects.
      const historyForAI = transcriptRef.current.map(t => ({
          role: t.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: t.text }]
      }));
      const historyContext = historyForAI.slice(0, -1); 
      const response = await chatWithAgent(agent.model, agent.promptTemplate, historyContext, text, agent.temperature);
      isProcessingRef.current = false;
      setIsProcessing(false);
      handleAgentSpeak(response);
  };

  const handleAgentSpeak = async (text: string) => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      if (recognitionRef.current) recognitionRef.current.abort();
      updateTranscript({ role: 'agent', text });
      const apiKey = StorageService.getElevenLabsKey();
      if (apiKey && allVoices.find(v => v.id === agent.voiceId)) {
          try {
              const audioUrl = await ElevenLabsService.textToSpeech(apiKey, agent.voiceId, text);
              if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
              }
              const audio = new Audio(audioUrl);
              audioRef.current = audio;
              audio.onended = () => {
                  isSpeakingRef.current = false;
                  setIsSpeaking(false);
                  startListening();
              };
              audio.onerror = () => {
                  isSpeakingRef.current = false;
                  setIsSpeaking(false);
                  startListening();
              };
              await audio.play();
              return; 
          } catch (err) {}
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      utterance.voice = voices.find(v => v.lang === 'en-US') || null;
      utterance.onend = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          startListening();
      };
      synthRef.current.speak(utterance);
  };

  const toggleMic = () => {
      if (isListening) recognitionRef.current?.stop();
      else try { recognitionRef.current?.start(); } catch(e) {}
  };

  const handleClose = () => {
      isCallActiveRef.current = false;
      onClose();
  };

  return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm h-[650px] flex flex-col overflow-hidden relative border-8 border-slate-900 ring-1 ring-white/20">
             <div className="bg-slate-50 p-8 flex flex-col items-center border-b border-slate-100 pb-6">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center mb-4 ring-4 ring-indigo-50 shadow-inner relative">
                     <Bot className="w-12 h-12 text-indigo-600" />
                     {isSpeaking && <div className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20"></div>}
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 text-center">{agent.name}</h3>
                 <p className={`text-base font-medium mt-1 ${status === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`}>
                     {status === 'connecting' ? 'Connecting...' : status === 'connected' ? 'Live Call' : 'Call Ended'}
                 </p>
             </div>
             <div className="flex-1 bg-white p-5 overflow-y-auto space-y-4">
                 {transcript.length === 0 && !currentInterim && (
                     <div className="h-full flex items-center justify-center opacity-30"><PhoneCall className="w-16 h-16 text-slate-300" /></div>
                 )}
                 {transcript.map((t, i) => (
                     <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${t.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none shadow-sm'}`}>
                             {t.text}
                         </div>
                     </div>
                 ))}
                 {currentInterim && (
                     <div className="flex justify-end">
                         <div className="max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm bg-indigo-600/70 text-white rounded-br-none animate-pulse">{currentInterim}...</div>
                     </div>
                 )}
                 {isProcessing && <div className="text-xs text-slate-400 ml-2 animate-pulse font-medium">Thinking...</div>}
                 {isSpeaking && <div className="text-xs text-indigo-500 ml-2 animate-pulse font-medium">Speaking...</div>}
                 <div ref={transcriptEndRef} />
             </div>
             <div className="p-8 bg-slate-50 grid grid-cols-3 gap-6 items-center border-t border-slate-100">
                 <button onClick={toggleMic} className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all duration-200 ${isListening ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 scale-110' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                     {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
                 </button>
                 <button onClick={handleClose} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-200 mx-auto hover:bg-red-600 transition-transform hover:scale-105 active:scale-95">
                     <PhoneCall className="w-9 h-9 fill-current rotate-[135deg]" />
                 </button>
                 <button className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 mx-auto hover:bg-slate-100"><Volume2 className="w-7 h-7" /></button>
             </div>
          </div>
      </div>
  );
};

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [folders, setFolders] = useState<AgentFolder[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [allPhoneNumbers, setAllPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>([]);
  const [voiceUploadFile, setVoiceUploadFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); 
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all'); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [folderModal, setFolderModal] = useState<{isOpen: boolean, mode: 'create' | 'edit', folderId?: string, initialName?: string}>({ isOpen: false, mode: 'create' });
  const [folderNameInput, setFolderNameInput] = useState('');
  const [isTestCallOpen, setIsTestCallOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'behavior' | 'phone' | 'mapping' | 'integration'>('overview');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [ghlCustomFields, setGhlCustomFields] = useState<GHLCustomField[]>([]);
  const [ghlTags, setGhlTags] = useState<GHLTag[]>([]);
  const [isLoadingGhlData, setIsLoadingGhlData] = useState(false);
  const [ghlDataError, setGhlDataError] = useState<string | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentFolder, setNewAgentFolder] = useState('');
  const [newAgentAccount, setNewAgentAccount] = useState('');
  const [webhookTest, setWebhookTest] = useState<TriggerPayload>({ firstName: '', lastName: '', phone: '', email: '' });
  const [isFiringWebhook, setIsFiringWebhook] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);

  useEffect(() => { loadData(); loadVoices(); return () => { if (currentAudioRef.current) currentAudioRef.current.pause(); }; }, []);

  const loadData = () => {
    setAgents(StorageService.getAgents());
    setFolders(StorageService.getFolders());
    setAccounts(StorageService.getAccounts());
    setAllPhoneNumbers(StorageService.getPhoneNumbers());
  };

  const loadVoices = async () => {
      const elevenKey = StorageService.getElevenLabsKey();
      if (!elevenKey) {
          const browserVoices = [
              { id: 'v1', name: 'Standard Female (US)', gender: 'female', lang: 'en-US', flag: '🇺🇸', category: 'standard' },
              { id: 'v2', name: 'Standard Male (US)', gender: 'male', lang: 'en-US', flag: '🇺🇸', category: 'standard' },
              { id: 'v3', name: 'Standard Female (UK)', gender: 'female', lang: 'en-GB', flag: '🇬🇧', category: 'standard' },
          ];
          setAvailableVoices(browserVoices as VoiceProfile[]);
          return;
      }
      try {
          const realVoices = await ElevenLabsService.getVoices(elevenKey);
          setAvailableVoices(realVoices);
      } catch (e) {
          console.error("Failed to load voices", e);
          setAvailableVoices([ { id: 'err', name: 'Error loading voices. Check API Key.', gender: 'unknown', lang: 'en-US', flag: '⚠️', category: 'standard' } ]);
      }
  };

  useEffect(() => {
      if (editingAgent && activeTab === 'mapping') {
          if (editingAgent.ghlLocationId) {
             const account = accounts.find(a => a.locationId === editingAgent.ghlLocationId);
             if (account) fetchGhlData(account);
          } else {
             setGhlCustomFields([]);
             setGhlTags([]);
          }
      }
  }, [editingAgent?.ghlLocationId, activeTab]);

  const fetchGhlData = async (account: ConnectedAccount) => {
      setIsLoadingGhlData(true);
      setGhlDataError(null);
      try {
          const isDemo = account.isDemo ?? true;
          const fields = await GHLService.getCustomFields(account.apiKey, account.locationId, isDemo); 
          const tags = await GHLService.getTags(account.apiKey, account.locationId, isDemo);
          setGhlCustomFields(fields);
          setGhlTags(tags);
      } catch (e: any) {
          setGhlDataError("Failed to fetch GHL configuration. Please check your integration.");
      } finally {
          setIsLoadingGhlData(false);
      }
  };

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const agent = agents.find(a => a.id === id);
    if (agent) {
      const updated: Agent = { ...agent, status: agent.status === 'active' ? 'paused' : 'active' };
      StorageService.saveAgent(updated);
      loadData();
      if (editingAgent?.id === id) setEditingAgent(updated);
      showToast(`Agent ${updated.status === 'active' ? 'activated' : 'paused'}`);
    }
  };

  const handleDeleteAgent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete agent?')) {
      StorageService.deleteAgent(id);
      loadData();
      if (editingAgent?.id === id) setEditingAgent(null);
      showToast("Agent deleted");
    }
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setVoiceUploadFile(e.target.files[0]); };

  const handleCloneVoice = async () => {
      if (!voiceUploadFile) return;
      const apiKey = StorageService.getElevenLabsKey();
      if (!apiKey) { alert("Please add ElevenLabs API Key"); return; }
      setIsCloning(true);
      try {
          const name = voiceUploadFile.name.replace(/\.[^/.]+$/, "").substring(0, 20);
          await ElevenLabsService.addVoice(apiKey, name, voiceUploadFile);
          await loadVoices();
          showToast(`Voice cloned!`);
          setVoiceUploadFile(null);
      } catch (e: any) { alert(`Error: ${e.message}`); } finally { setIsCloning(false); }
  };

  const openFolderModal = (mode: 'create' | 'edit', folder?: AgentFolder) => {
      setFolderModal({ isOpen: true, mode, folderId: folder?.id, initialName: folder?.name });
      setFolderNameInput(folder?.name || '');
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    if (folderModal.mode === 'create') {
        StorageService.saveFolder({ id: crypto.randomUUID(), name: folderNameInput });
        showToast("Folder created");
    } else if (folderModal.mode === 'edit' && folderModal.folderId) {
        StorageService.renameFolder(folderModal.folderId, folderNameInput);
        showToast("Folder renamed");
    }
    setFolderModal({ isOpen: false, mode: 'create' });
    setFolderNameInput('');
    loadData();
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete folder?')) {
        StorageService.deleteFolder(id);
        if (selectedFolderId === id) setSelectedFolderId('all');
        loadData();
        showToast("Folder deleted");
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    const newAgent: Agent = {
        id: crypto.randomUUID(),
        name: newAgentName,
        role: newAgentRole || 'General Assistant',
        status: 'draft',
        // Update default model to gemini-3 series.
        model: 'gemini-3-flash-preview',
        voiceId: availableVoices[0]?.id || 'v1',
        phoneNumbers: [],
        promptTemplate: 'You are a helpful assistant.',
        temperature: 0.7,
        folderId: newAgentFolder || undefined,
        ghlLocationId: newAgentAccount || undefined,
        createdAt: new Date().toISOString(),
        firstSentence: "Hello! How can I help you today?",
        transcriptionLanguage: 'en-US',
        maxDurationSeconds: 600,
        silenceTimeoutSeconds: 2.0,
        interruptionSensitivity: 0.5,
        waitForGreeting: true,
        ghlFieldMapping: { data: {}, tags: {} }
    };
    StorageService.saveAgent(newAgent);
    setNewAgentName(''); setNewAgentRole(''); setIsCreateModalOpen(false); loadData(); setEditingAgent(newAgent); showToast("Agent created");
  };

  const handleSaveAgent = () => { if (editingAgent) { StorageService.saveAgent(editingAgent); loadData(); showToast("Changes saved"); }};

  const handleOptimizePrompt = async () => {
      if (!editingAgent) return;
      setIsOptimizing(true);
      try {
          const optimized = await suggestOptimizedPrompt(editingAgent.promptTemplate);
          setEditingAgent({ ...editingAgent, promptTemplate: optimized });
          showToast("Prompt optimized");
      } finally { setIsOptimizing(false); }
  };

  const handleAssignNumber = (numberId: string, assigned: boolean) => {
      if (!editingAgent) return;
      if (assigned) StorageService.assignNumberToAgent(numberId, editingAgent.id);
      else StorageService.unassignNumber(numberId);
      loadData();
      const updatedAgent = StorageService.getAgents().find(a => a.id === editingAgent.id);
      if (updatedAgent) setEditingAgent(updatedAgent);
  };

  const handlePlayVoice = async (voiceId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      if (playingVoiceId === voiceId) { setPlayingVoiceId(null); return; }
      setPlayingVoiceId(voiceId);
      const apiKey = StorageService.getElevenLabsKey();
      try {
          if (apiKey) {
              const url = await ElevenLabsService.textToSpeech(apiKey, voiceId, "Hello, this is a real generated preview of my voice.");
              const audio = new Audio(url);
              currentAudioRef.current = audio;
              audio.onended = () => { setPlayingVoiceId(null); currentAudioRef.current = null; };
              audio.play();
          } else {
              const utterance = new SpeechSynthesisUtterance("Hello, this is a sample.");
              window.speechSynthesis.cancel();
              utterance.onend = () => setPlayingVoiceId(null);
              window.speechSynthesis.speak(utterance);
          }
      } catch (err) { setPlayingVoiceId(null); showToast("Audio failed"); }
  };

  const handleUpdateMapping = (type: 'data' | 'tags', key: string, value: string) => {
      if (!editingAgent) return;
      setEditingAgent(prev => {
          if (!prev) return null;
          const currentMapping = prev.ghlFieldMapping || { data: {}, tags: {} };
          return { ...prev, ghlFieldMapping: { ...currentMapping, [type]: { ...currentMapping[type], [key]: value } } };
      });
  };
  
  const handleTestWebhook = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingAgent || !webhookTest.phone) return;
      
      setIsFiringWebhook(true);
      setWebhookResponse(null);

      try {
          const creds = StorageService.getTwilioCreds();
          const allNumbers = StorageService.getPhoneNumbers();
          
          let fromNumber = allNumbers.find(n => n.assignedAgentId === editingAgent.id)?.number;
          if (!fromNumber) fromNumber = allNumbers.find(n => n.status === 'active')?.number;
          if (!fromNumber && creds?.isDemo) fromNumber = '+15005550006'; 
          
          if (!creds) throw new Error("Twilio credentials missing. Please connect account first.");
          if (!fromNumber) throw new Error("No active phone numbers found. Please buy a number.");

          const makeUrl = StorageService.getMakeWebhook();
          
          if (makeUrl) {
              const twilioVoice = mapVoiceIdToTwilio(editingAgent.voiceId);
              
              const payload = {
                  agentId: editingAgent.id,
                  agentName: editingAgent.name,
                  voice: twilioVoice,
                  firstSentence: editingAgent.firstSentence,
                  phone: webhookTest.phone,
                  fromNumber: fromNumber,
                  firstName: webhookTest.firstName,
                  lastName: webhookTest.lastName,
                  email: webhookTest.email,
                  prompt: editingAgent.promptTemplate,
                  temperature: editingAgent.temperature
              };

              await fetch(makeUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });

              setWebhookResponse({ success: true, sid: 'MAKE_TRIGGERED', status: 'sent_to_make' });
              showToast("Trigger sent to Make.com Webhook!");
              return;
          }

          const customBackendUrl = StorageService.getBackendUrl();

          const result = await TwilioService.initiateOutboundCall(
              creds, 
              fromNumber, 
              webhookTest.phone, 
              editingAgent.name,
              editingAgent.firstSentence, 
              editingAgent.voiceId, 
              creds.isDemo,
              customBackendUrl
          );

          setWebhookResponse({ success: true, sid: result.sid, status: result.status });
          showToast("Call initiated directly via Twilio API");
      } catch (err: any) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setWebhookResponse({ success: false, error: errorMsg });
      } finally {
          setIsFiringWebhook(false);
      }
  };

  const openCreateModal = () => {
      if (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized') setNewAgentFolder(selectedFolderId);
      else setNewAgentFolder('');
      
      if (selectedAccountId !== 'all') setNewAgentAccount(selectedAccountId);
      else setNewAgentAccount('');

      setIsCreateModalOpen(true);
  };

  const filteredAgents = agents.filter(agent => {
    if (selectedAccountId !== 'all' && agent.ghlLocationId !== selectedAccountId) return false;
    if (selectedFolderId === 'all') return true;
    if (selectedFolderId === 'uncategorized') return !agent.folderId;
    return agent.folderId === selectedFolderId;
  });

  const getFilteredCounts = (fid: string) => {
      if (fid === 'all') return agents.length;
      if (fid === 'uncategorized') return agents.filter(a => !a.folderId).length;
      return agents.filter(a => a.folderId === fid).length;
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 relative">
      
      {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {toastMessage}
          </div>
      )}

      {/* LEFT SIDEBAR - Folders */}
      <div className="w-64 flex flex-col shrink-0">
        <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Library</h2>
            <button 
                onClick={() => openFolderModal('create')}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-100" title="New Folder">
                <FolderPlus className="w-4 h-4" />
            </button>
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto pr-2">
            <button 
                onClick={() => setSelectedFolderId('all')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${selectedFolderId === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4" />
                    All Agents
                </div>
                <span className="text-xs bg-white text-slate-500 py-0.5 px-2 rounded-full border border-slate-100 shadow-sm">
                    {getFilteredCounts('all')}
                </span>
            </button>

            <button 
                onClick={() => setSelectedFolderId('uncategorized')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${selectedFolderId === 'uncategorized' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2.5">
                    <Filter className="w-4 h-4" />
                    Uncategorized
                </div>
                <span className="text-xs bg-white text-slate-500 py-0.5 px-2 rounded-full border border-slate-100 shadow-sm">
                    {getFilteredCounts('uncategorized')}
                </span>
            </button>

            <div className="pt-4 mt-4 border-t border-slate-100">
                <div className="px-1 mb-2 text-[10px] font-bold text-slate-400 uppercase">CUSTOM FOLDERS</div>
                {folders.map(folder => (
                    <button 
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${selectedFolderId === folder.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2.5 truncate">
                            <Folder className={`w-4 h-4 ${selectedFolderId === folder.id ? 'fill-indigo-200 text-indigo-600' : 'text-slate-400'}`} />
                            <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-slate-400 mr-2">{getFilteredCounts(folder.id)}</span>
                            <div 
                                onClick={(e) => { e.stopPropagation(); openFolderModal('edit', folder); }}
                                className="p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded transition-colors mr-1"
                            >
                                <Pencil className="w-3 h-3" />
                            </div>
                            <div 
                                onClick={(e) => handleDeleteFolder(folder.id, e)}
                                className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 rounded-2xl border border-slate-200/50 p-6">
        
        {/* Top Header & Context Switcher */}
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agents</h1>
                
                <div className="relative group">
                     <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="appearance-none pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="all">All Connected Accounts</option>
                        {accounts.map(acc => (
                            <option key={acc.locationId} value={acc.locationId}>{acc.locationName}</option>
                        ))}
                    </select>
                    <Building className="absolute left-3 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <ChevronDown className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <button 
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200/50"
            >
                <Plus className="w-4 h-4" />
                Create Agent
            </button>
        </div>

        {/* Agents Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
            {filteredAgents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No agents found</h3>
                    <p className="text-slate-500 mb-6 max-w-xs text-center">
                        {selectedAccountId !== 'all' 
                         ? "There are no agents assigned to this GHL account yet."
                         : "Create your first AI agent to get started."}
                    </p>
                    <button 
                        onClick={openCreateModal}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                        Deploy New Agent
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAgents.map((agent) => (
                    <div key={agent.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col h-[280px]">
                        <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        
                        <div className="p-6 flex-1 cursor-pointer" onClick={() => setEditingAgent(agent)}>
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 truncate max-w-[140px]" title={agent.name}>{agent.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide">
                                        {agent.role}
                                        </span>
                                    </div>
                                </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Model</span>
                                    <span className="text-slate-900 font-medium">{agent.model.replace('gemini-', '').replace('-preview', '')}</span>
                                </div>
                                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Assigned Numbers</span>
                                    <span className="text-slate-900 font-medium">{agent.phoneNumbers.length}</span>
                                </div>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`font-medium flex items-center gap-1.5 ${agent.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                        {agent.status === 'active' ? 'Active' : 'Paused'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 p-4 pt-0 mt-auto">
                            <button 
                                onClick={(e) => handleToggleStatus(agent.id, e)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                agent.status === 'active' 
                                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                }`}>
                                <Power className="w-4 h-4" />
                                {agent.status === 'active' ? 'Pause' : 'Activate'}
                            </button>
                            <button 
                                onClick={() => setEditingAgent(agent)}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    ))}
                    
                    <button 
                        onClick={openCreateModal}
                        className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group min-h-[280px]"
                    >
                        <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                            <Plus className="w-7 h-7 text-indigo-500" />
                        </div>
                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-700">Deploy New Agent</h3>
                        <p className="text-sm text-slate-500 mt-1 text-center max-w-[200px]">Configure a new AI persona from scratch.</p>
                    </button>
                </div>
            )}
        </div>

      </div>

      {/* 1. Folder Modal */}
      {folderModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm animate-in zoom-in-95">
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">
                          {folderModal.mode === 'create' ? 'Create New Folder' : 'Rename Folder'}
                      </h3>
                      <form onSubmit={handleFolderSubmit}>
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Folder Name"
                            value={folderNameInput}
                            onChange={(e) => setFolderNameInput(e.target.value)}
                            className="w-full border-slate-200 rounded-lg mb-4 focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3"
                          />
                          <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setFolderModal({ ...folderModal, isOpen: false })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                              <button type="submit" disabled={!folderNameInput.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                                  {folderModal.mode === 'create' ? 'Create' : 'Save'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* 2. Create Agent Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900">Deploy New Agent</h3>
                      <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                          <input type="text" required value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3" placeholder="e.g. Sales Assistant" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Role / Job Title</label>
                          <input type="text" value={newAgentRole} onChange={(e) => setNewAgentRole(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3" placeholder="e.g. Sales" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <StyledSelect 
                                label="Folder"
                                value={newAgentFolder}
                                onChange={setNewAgentFolder}
                                options={[
                                    { value: "", label: "Uncategorized" },
                                    ...folders.map(f => ({ value: f.id, label: f.name }))
                                ]}
                            />
                        </div>
                        <div>
                            <StyledSelect 
                                label="GHL Account"
                                value={newAgentAccount}
                                onChange={setNewAgentAccount}
                                options={[
                                    { value: "", label: "Unassigned" },
                                    ...accounts.map(a => ({ value: a.locationId, label: a.locationName }))
                                ]}
                            />
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end gap-2">
                          <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Create Agent</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* 3. TEST CALL MODAL */}
      {isTestCallOpen && editingAgent && (
          <TestCallModal agent={editingAgent} onClose={() => setIsTestCallOpen(false)} allVoices={availableVoices} />
      )}

      {/* 4. EDIT AGENT FULL MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex justify-center items-center p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{editingAgent.name}</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                <span className="uppercase tracking-wider font-bold">{editingAgent.role}</span>
                                <span className="text-slate-300">|</span>
                                <span className={`${editingAgent.status === 'active' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                    {editingAgent.status === 'active' ? 'Active' : 'Paused'}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <button
                            onClick={() => setIsTestCallOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                         >
                            <PhoneCall className="w-4 h-4" />
                            Test Call
                         </button>
                         <button 
                            onClick={handleSaveAgent}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                        <div className="w-px h-8 bg-slate-200 mx-1"></div>
                        <button 
                            onClick={() => setEditingAgent(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="flex flex-1 min-h-0">
                    <div className="w-64 bg-slate-50 border-r border-slate-200 p-3 space-y-1">
                        {[
                            { id: 'overview', label: 'Overview', icon: Bot },
                            { id: 'intelligence', label: 'Intelligence', icon: BrainCircuit },
                            { id: 'phone', label: 'Phone & Voice', icon: Phone },
                            { id: 'behavior', label: 'Behavior', icon: Sliders },
                            { id: 'mapping', label: 'CRM Mapping', icon: Database },
                            { id: 'integration', label: 'Webhook', icon: Workflow }
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'}`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} /> 
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white relative">
                        <div className="max-w-4xl mx-auto p-10">
                        
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">General Settings</h3>
                                    <p className="text-slate-500 text-sm">Basic information and organization for this agent.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                                        <input 
                                            type="text" 
                                            value={editingAgent.name} 
                                            onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                                            className="w-full border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                        <input 
                                            type="text" 
                                            value={editingAgent.role} 
                                            onChange={(e) => setEditingAgent({...editingAgent, role: e.target.value})}
                                            className="w-full border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3" 
                                        />
                                    </div>
                                    <div>
                                        <StyledSelect 
                                            label="Folder"
                                            value={editingAgent.folderId || ''}
                                            onChange={(val) => setEditingAgent({...editingAgent, folderId: val || undefined})}
                                            options={[
                                                { value: "", label: "Uncategorized" },
                                                ...folders.map(f => ({ value: f.id, label: f.name }))
                                            ]}
                                        />
                                    </div>
                                    <div className="col-span-2 pt-4 border-t border-slate-100">
                                        <StyledSelect 
                                            label="Connected GHL Account"
                                            value={editingAgent.ghlLocationId || ''}
                                            onChange={(val) => setEditingAgent({...editingAgent, ghlLocationId: val || undefined})}
                                            options={[
                                                { value: "", label: "No Integration", subLabel: "Agent runs independently" },
                                                ...accounts.map(a => ({ value: a.locationId, label: a.locationName, subLabel: `ID: ${a.locationId}` }))
                                            ]}
                                        />
                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                            <Building className="w-3 h-3" />
                                            Calls made by this agent will be synced to this CRM account.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-12 mt-12 border-t border-slate-100">
                                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-red-900">Danger Zone</h4>
                                            <p className="text-xs text-red-700 mt-1">Permanently delete this agent and all its history.</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteAgent(editingAgent.id, e)}
                                            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                                        >
                                            Delete Agent
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'intelligence' && (
                            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">System Prompt</h3>
                                        <p className="text-slate-500 text-sm">Define the agent's personality and instructions.</p>
                                    </div>
                                    <button 
                                        onClick={handleOptimizePrompt}
                                        disabled={isOptimizing}
                                        className="text-sm flex items-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 border border-indigo-100 shadow-sm"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {isOptimizing ? 'Optimizing...' : 'Auto-Optimize with AI'}
                                    </button>
                                </div>
                                <div className="flex-1 mb-6 relative group">
                                    <textarea 
                                        value={editingAgent.promptTemplate}
                                        onChange={(e) => setEditingAgent({...editingAgent, promptTemplate: e.target.value})}
                                        className="w-full h-[400px] border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-6 font-mono text-sm leading-relaxed resize-none shadow-sm text-slate-800 bg-white"
                                        placeholder="You are a helpful assistant..."
                                    />
                                    <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingAgent.promptTemplate.length} chars
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                                    <div>
                                        <StyledSelect 
                                            label="AI Model"
                                            value={editingAgent.model}
                                            onChange={(val) => setEditingAgent({...editingAgent, model: val})}
                                            options={[
                                                // Updated model names based on task type and series.
                                                { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', subLabel: 'Fastest response, ideal for voice calls' },
                                                { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', subLabel: 'Highest reasoning capability' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-sm font-medium text-slate-700">Creativity (Temperature)</label>
                                            <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{editingAgent.temperature}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.1"
                                            value={editingAgent.temperature}
                                            onChange={(e) => setEditingAgent({...editingAgent, temperature: parseFloat(e.target.value)})}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium uppercase tracking-wide">
                                            <span>Strict</span>
                                            <span>Balanced</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'behavior' && (
                             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">Conversation Behavior</h3>
                                    <p className="text-slate-500 text-sm">Fine-tune how the agent speaks and listens.</p>
                                </div>
                                
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">First Sentence (Greeting)</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={editingAgent.firstSentence || ''} 
                                                onChange={(e) => setEditingAgent({...editingAgent, firstSentence: e.target.value})}
                                                placeholder="Hello, this is [Name]..."
                                                className="w-full border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3 pr-10" 
                                            />
                                            <div className="absolute right-3 top-2.5 text-slate-400">
                                                <MessageSquare className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">The agent will speak this immediately when the call connects.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Silence Timeout</label>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    value={editingAgent.silenceTimeoutSeconds || 2.0} 
                                                    onChange={(e) => setEditingAgent({...editingAgent, silenceTimeoutSeconds: parseFloat(e.target.value)})}
                                                    className="w-full border-slate-200 rounded-lg py-2.5 px-3" 
                                                />
                                                <span className="text-sm text-slate-500 whitespace-nowrap">seconds</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">Wait time after user stops speaking.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Max Duration</label>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    step="60"
                                                    value={editingAgent.maxDurationSeconds || 600} 
                                                    onChange={(e) => setEditingAgent({...editingAgent, maxDurationSeconds: parseInt(e.target.value)})}
                                                    className="w-full border-slate-200 rounded-lg py-2.5 px-3" 
                                                />
                                                <span className="text-sm text-slate-500 whitespace-nowrap">seconds</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">Hard limit for call length.</p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="font-semibold text-slate-800 text-sm">Interruption Sensitivity</label>
                                            <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{editingAgent.interruptionSensitivity || 0.5}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.1"
                                            value={editingAgent.interruptionSensitivity || 0.5}
                                            onChange={(e) => setEditingAgent({...editingAgent, interruptionSensitivity: parseFloat(e.target.value)})}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                                            <span>Hard to Interrupt</span>
                                            <span>Very Sensitive</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 p-4 border border-slate-100 rounded-lg">
                                        <input 
                                            id="waitForGreeting"
                                            type="checkbox"
                                            checked={editingAgent.waitForGreeting}
                                            onChange={(e) => setEditingAgent({...editingAgent, waitForGreeting: e.target.checked})}
                                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                        />
                                        <div>
                                            <label htmlFor="waitForGreeting" className="text-sm font-medium text-slate-900">Wait for user greeting</label>
                                            <p className="text-xs text-slate-500 mt-0.5">For inbound calls, wait for the user to say "Hello" before the agent starts speaking.</p>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}

                        {activeTab === 'phone' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                                 <div className="flex gap-8 items-start h-full min-h-0">
                                     <div className="flex-1 flex flex-col h-full min-h-0">
                                         <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 shrink-0">
                                             <Volume2 className="w-5 h-5 text-indigo-600" />
                                             Available Voices
                                         </h3>
                                         
                                         {availableVoices.length === 0 ? (
                                             <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
                                                 <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                                 <p className="text-sm text-amber-800 font-medium">No voices loaded.</p>
                                                 <p className="text-xs text-amber-600">Please check your ElevenLabs API Key in Settings.</p>
                                             </div>
                                         ) : (
                                             <div className="flex-1 overflow-y-auto pr-2 min-h-0 pb-4">
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {availableVoices.map((voice) => (
                                                        <div 
                                                            key={voice.id}
                                                            onClick={() => setEditingAgent({...editingAgent, voiceId: voice.id})}
                                                            className={`relative cursor-pointer group rounded-lg border transition-all duration-200 overflow-hidden ${editingAgent.voiceId === voice.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xl" role="img" aria-label={voice.lang}>{voice.flag}</span>
                                                                    {editingAgent.voiceId === voice.id && (
                                                                        <div className="bg-indigo-600 rounded-full p-0.5">
                                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="font-bold text-slate-900 text-xs mb-0.5 truncate" title={voice.name}>{voice.name}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-3">
                                                                    {voice.category === 'cloned' ? 'Cloned' : voice.gender} • {voice.lang.split('-')[1]}
                                                                </p>
                                                                
                                                                <button 
                                                                    onClick={(e) => handlePlayVoice(voice.id, e)}
                                                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                                >
                                                                    {playingVoiceId === voice.id ? (
                                                                        <StopCircle className="w-3 h-3 text-red-500 fill-current" />
                                                                    ) : (
                                                                        <Play className="w-3 h-3 fill-current" />
                                                                    )}
                                                                    {playingVoiceId === voice.id ? 'Stop' : 'Preview'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                             </div>
                                         )}
                                     </div>

                                     <div className="w-80 shrink-0 bg-slate-50 rounded-xl border border-slate-200 p-5 overflow-y-auto">
                                         <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                                             <FileAudio className="w-4 h-4 text-slate-500" />
                                             Voice Lab
                                         </h3>
                                         <p className="text-xs text-slate-500 mb-6">Clone a specific voice for your agent using ElevenLabs.</p>

                                         <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-white hover:border-indigo-300 transition-all bg-slate-100/50">
                                             <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                                             <p className="text-xs font-medium text-slate-700 mb-1">
                                                 {voiceUploadFile ? voiceUploadFile.name : "Drag & drop audio file"}
                                             </p>
                                             <p className="text-[10px] text-slate-400 mb-4">MP3 or WAV, up to 10MB</p>
                                             
                                             <label className="cursor-pointer">
                                                 <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" />
                                                 <span className="bg-white border border-slate-200 text-indigo-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-50 shadow-sm transition-colors">
                                                     {voiceUploadFile ? "Change File" : "Browse Files"}
                                                 </span>
                                             </label>
                                         </div>

                                         {voiceUploadFile && !isCloning && (
                                             <button 
                                                onClick={handleCloneVoice}
                                                className="w-full mt-4 flex justify-center items-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                                             >
                                                 <Sparkles className="w-3 h-3" />
                                                 Clone with ElevenLabs
                                             </button>
                                         )}

                                         {isCloning && (
                                             <div className="mt-6 space-y-2">
                                                 <div className="flex justify-between text-xs font-medium text-slate-600">
                                                     <span>Uploading & Training...</span>
                                                 </div>
                                                 <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                     <div 
                                                        className="bg-indigo-600 h-1.5 rounded-full animate-progress" 
                                                        style={{ width: '100%' }}
                                                     ></div>
                                                 </div>
                                                 <p className="text-[10px] text-slate-400 text-center pt-2">
                                                     This may take a moment.
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                <div className="border-t border-slate-100 pt-8 shrink-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">Assigned Numbers</h3>
                                            <p className="text-slate-500 text-sm">Phone numbers that route to this agent.</p>
                                        </div>
                                        <button className="text-sm text-indigo-600 font-medium hover:underline">Buy new number</button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {allPhoneNumbers.length === 0 ? (
                                            <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                <Phone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                <p className="text-slate-500 text-sm font-medium">No numbers purchased yet.</p>
                                            </div>
                                        ) : (
                                            allPhoneNumbers.map(num => {
                                                const isAssignedToThis = num.assignedAgentId === editingAgent.id;
                                                const isAssignedToOther = num.assignedAgentId && !isAssignedToThis;
                                                
                                                return (
                                                    <div key={num.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isAssignedToThis ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAssignedToThis ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                <Phone className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 font-mono">{num.friendlyName}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                     <span className="text-xs text-slate-500">{num.country === 'US' ? 'United States' : num.country}</span>
                                                                     {num.capabilities.map(c => (
                                                                         <span key={c} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{c}</span>
                                                                     ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {isAssignedToOther ? (
                                                            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 font-medium">
                                                                Assigned to other agent
                                                            </span>
                                                        ) : (
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isAssignedToThis}
                                                                    onChange={(e) => handleAssignNumber(num.id, e.target.checked)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            </label>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mapping' && (
                             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">GHL Field Mapping</h3>
                                    <p className="text-slate-500 text-sm">Sync internal call data and outcomes to your GoHighLevel Custom Fields and Tags.</p>
                                 </div>

                                 {!editingAgent.ghlLocationId ? (
                                     <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                         <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                                         <h4 className="text-amber-900 font-bold mb-2">No Account Connected</h4>
                                         <p className="text-amber-700 text-sm mb-4">Please select a Connected GHL Account in the <strong>Overview</strong> tab to enable field mapping.</p>
                                         <button 
                                            onClick={() => setActiveTab('overview')}
                                            className="px-4 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100"
                                         >
                                             Go to Overview
                                         </button>
                                     </div>
                                 ) : isLoadingGhlData ? (
                                     <div className="flex flex-col items-center justify-center py-12">
                                         <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                                         <p className="text-slate-500 text-sm">Fetching fields from GHL...</p>
                                     </div>
                                 ) : ghlDataError ? (
                                     <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center">
                                         <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                                         <h4 className="text-red-900 font-bold mb-1">Connection Error</h4>
                                         <p className="text-red-700 text-sm">{ghlDataError}</p>
                                     </div>
                                 ) : (
                                     <div className="space-y-8">
                                         <div className="bg-white rounded-xl border border-slate-200">
                                             <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                                                 <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                     <Database className="w-4 h-4 text-indigo-500" /> 
                                                     Call Data Fields
                                                 </h4>
                                             </div>
                                             <div className="divide-y divide-slate-100">
                                                 {[
                                                     { key: 'recording', label: 'Recording Link' },
                                                     { key: 'transcription', label: 'Full Transcription' },
                                                     { key: 'summary', label: 'Call Summary' },
                                                     { key: 'duration', label: 'Call Duration (seconds)' }
                                                 ].map((field) => (
                                                     <div key={field.key} className="grid grid-cols-12 items-center gap-4 px-6 py-4">
                                                         <div className="col-span-4 text-sm font-medium text-slate-700">{field.label}</div>
                                                         <div className="col-span-1 text-center text-slate-400">→</div>
                                                         <div className="col-span-7">
                                                             <StyledSelect 
                                                                options={[
                                                                    { value: "", label: "Do not sync" },
                                                                    ...ghlCustomFields.map(cf => ({ value: cf.id, label: cf.name, subLabel: cf.dataType }))
                                                                ]}
                                                                value={editingAgent.ghlFieldMapping?.data?.[field.key as keyof typeof editingAgent.ghlFieldMapping.data] || ''}
                                                                onChange={(val) => handleUpdateMapping('data', field.key, val)}
                                                                placeholder="Select GHL Field..."
                                                             />
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>

                                         <div className="bg-white rounded-xl border border-slate-200">
                                             <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                                                 <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                     <Tag className="w-4 h-4 text-indigo-500" /> 
                                                     Call Status Tags
                                                 </h4>
                                             </div>
                                             <div className="p-6 bg-slate-50/50 text-sm text-slate-500 mb-0 border-b border-slate-100">
                                                 Automatically apply these existing GHL tags to the contact based on the call result.
                                             </div>
                                             <div className="divide-y divide-slate-100">
                                                 {[
                                                     { key: 'answered', label: 'Answered' },
                                                     { key: 'noAnswer', label: 'No-Answer' },
                                                     { key: 'busy', label: 'on Busy' },
                                                     { key: 'voicemail', label: 'On Voicemail' },
                                                     { key: 'userHangup', label: 'On User Hang Up' },
                                                     { key: 'failed', label: 'On Failed' },
                                                     { key: 'transfer', label: 'On Call Transfer' },
                                                     { key: 'inactivity', label: 'Inactivity' }
                                                 ].map((tag) => (
                                                     <div key={tag.key} className="grid grid-cols-12 items-center gap-4 px-6 py-4">
                                                         <div className="col-span-4 text-sm font-medium text-slate-700">{tag.label}</div>
                                                         <div className="col-span-1 text-center text-slate-400">→</div>
                                                         <div className="col-span-7">
                                                             <StyledSelect 
                                                                options={[
                                                                    { value: "", label: "No tag" },
                                                                    ...ghlTags.map(t => ({ value: t.name, label: t.name }))
                                                                ]}
                                                                value={editingAgent.ghlFieldMapping?.tags?.[tag.key as keyof typeof editingAgent.ghlFieldMapping.tags] || ''}
                                                                onChange={(val) => handleUpdateMapping('tags', tag.key, val)}
                                                                placeholder="Select GHL Tag..."
                                                             />
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>

                                         <div className="bg-white rounded-xl border border-slate-200">
                                             <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                                                 <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                     <Workflow className="w-4 h-4 text-indigo-500" /> 
                                                     Call Direction Tags
                                                 </h4>
                                             </div>
                                             <div className="divide-y divide-slate-100">
                                                 {[
                                                     { key: 'inbound', label: 'Inbound Call' },
                                                     { key: 'outbound', label: 'Outbound Call' }
                                                 ].map((tag) => (
                                                     <div key={tag.key} className="grid grid-cols-12 items-center gap-4 px-6 py-4">
                                                         <div className="col-span-4 text-sm font-medium text-slate-700">{tag.label}</div>
                                                         <div className="col-span-1 text-center text-slate-400">→</div>
                                                         <div className="col-span-7">
                                                             <StyledSelect 
                                                                options={[
                                                                    { value: "", label: "No tag" },
                                                                    ...ghlTags.map(t => ({ value: t.name, label: t.name }))
                                                                ]}
                                                                value={editingAgent.ghlFieldMapping?.tags?.[tag.key as keyof typeof editingAgent.ghlFieldMapping.tags] || ''}
                                                                onChange={(val) => handleUpdateMapping('tags', tag.key, val)}
                                                                placeholder="Select GHL Tag..."
                                                             />
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        )}

                        {activeTab === 'integration' && (
                             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                 <div>
                                     <h3 className="text-xl font-bold text-slate-900 mb-1">Make.com Outbound Trigger</h3>
                                     <p className="text-slate-500 text-sm mb-6">Use this webhook to programmatically trigger an outbound call to a lead.</p>
                                     
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                         <div className="space-y-6">
                                            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                                                <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                                                    <div className="flex gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-mono">POST /v1/hooks/trigger</span>
                                                </div>
                                                <div className="p-6 font-mono text-sm text-slate-300 overflow-x-auto">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="text-emerald-400 font-bold">POST</span>
                                                        <button 
                                                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`https://api.nexusvoice.ai/v1/hooks/trigger/${editingAgent.id}`);
                                                                showToast("URL Copied");
                                                            }}
                                                        >
                                                            <Copy className="w-3 h-3" /> Copy URL
                                                        </button>
                                                    </div>
                                                    <p className="mb-6 select-all break-all text-xs text-blue-200">https://api.nexusvoice.ai/v1/hooks/trigger/{editingAgent.id}</p>
                                                    <div className="border-t border-slate-700/50 pt-4">
                                                        <p className="text-slate-500 mb-2 font-semibold text-xs uppercase tracking-wider">// Request Payload</p>
                                                        <pre className="text-blue-300 select-all whitespace-pre-wrap">
{`{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+15550001234",
  "email": "john@example.com",
  "source": "Website Form"
}`}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <Zap className="w-5 h-5 text-indigo-600 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-bold text-indigo-900">How it works</h4>
                                                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                                            When you send a POST request to this URL, the system will immediately initiate an outbound call to the provided <strong>phone</strong> number. The AI agent will introduce itself using the context provided.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                         </div>

                                         <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                             <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                 <Play className="w-4 h-4 text-emerald-500" />
                                                 Test Trigger
                                             </h4>
                                             
                                             <form onSubmit={handleTestWebhook} className="space-y-4">
                                                 <div className="grid grid-cols-2 gap-4">
                                                     <div>
                                                         <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                                                         <input 
                                                            type="text" 
                                                            required
                                                            value={webhookTest.firstName}
                                                            onChange={e => setWebhookTest({...webhookTest, firstName: e.target.value})}
                                                            className="w-full border-slate-200 rounded-lg text-sm px-3 py-2"
                                                            placeholder="Jane"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                                                         <input 
                                                            type="text" 
                                                            value={webhookTest.lastName}
                                                            onChange={e => setWebhookTest({...webhookTest, lastName: e.target.value})}
                                                            className="w-full border-slate-200 rounded-lg text-sm px-3 py-2"
                                                            placeholder="Doe"
                                                         />
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                                                     <input 
                                                        type="tel" 
                                                        required
                                                        value={webhookTest.phone}
                                                        onChange={e => setWebhookTest({...webhookTest, phone: e.target.value})}
                                                        className="w-full border-slate-200 rounded-lg text-sm px-3 py-2 font-mono"
                                                        placeholder="+1555..."
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email (Optional)</label>
                                                     <input 
                                                        type="email" 
                                                        value={webhookTest.email}
                                                        onChange={e => setWebhookTest({...webhookTest, email: e.target.value})}
                                                        className="w-full border-slate-200 rounded-lg text-sm px-3 py-2"
                                                        placeholder="jane@example.com"
                                                     />
                                                 </div>

                                                 <div className="pt-2">
                                                     <button 
                                                        type="submit" 
                                                        disabled={isFiringWebhook}
                                                        className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white font-medium py-2.5 rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-70"
                                                     >
                                                         {isFiringWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                         {isFiringWebhook ? 'Triggering...' : 'Simulate Webhook Event'}
                                                     </button>
                                                 </div>
                                             </form>

                                             {webhookResponse && (
                                                 <div className={`mt-4 p-3 rounded-lg text-xs font-mono border ${webhookResponse.success ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                                                     <p className="font-bold mb-1">{webhookResponse.success ? 'HTTP 200 OK' : 'HTTP 400 Error'}</p>
                                                     <p>{webhookResponse.success ? `Call Initiated. SID: ${webhookResponse.sid}` : webhookResponse.error}</p>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        )}
                        
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Agents;
