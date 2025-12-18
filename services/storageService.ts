
import { Agent, AgentFolder, ConnectedAccount, PhoneNumber, TwilioCredential, VoiceProfile } from '../types';

const STORAGE_KEYS = {
  AGENTS: 'nexus_agents',
  FOLDERS: 'nexus_folders',
  ACCOUNTS: 'nexus_ghl_accounts',
  PHONE_NUMBERS: 'nexus_phone_numbers',
  TWILIO_CREDS: 'nexus_twilio_creds',
  CUSTOM_VOICES: 'nexus_custom_voices',
  ELEVENLABS_KEY: 'nexus_elevenlabs_api_key',
  BACKEND_URL: 'nexus_backend_url',
  MAKE_WEBHOOK: 'nexus_make_webhook'
};

// Seed Data
const DEFAULT_FOLDERS: AgentFolder[] = [
  { id: 'sales', name: 'Sales Team' },
  { id: 'support', name: 'Customer Support' },
  { id: 'appointment', name: 'Appointments' }
];

// Start with empty numbers to avoid showing demo data without integration
const DEFAULT_NUMBERS: PhoneNumber[] = [];

const DEFAULT_AGENTS: Agent[] = [
  { 
    id: '1', 
    name: 'Dr. Sarah (Dental)', 
    role: 'Scheduler', 
    status: 'active', 
    model: 'gemini-3-flash-preview', 
    voiceId: 'v1', 
    phoneNumbers: [], 
    promptTemplate: 'You are a helpful dental assistant. Your goal is to schedule an appointment. Be polite and professional.', 
    temperature: 0.7, 
    folderId: 'appointment',
    createdAt: new Date().toISOString(),
    firstSentence: "Hello, this is Sarah from Bright Smiles Dental. How can I help you today?",
    transcriptionLanguage: 'en-US',
    maxDurationSeconds: 600,
    silenceTimeoutSeconds: 2.0,
    interruptionSensitivity: 0.5,
    waitForGreeting: true,
    ghlFieldMapping: { data: {}, tags: {} }
  },
  { 
    id: '2', 
    name: 'Sales Closer Mike', 
    role: 'Sales', 
    status: 'paused', 
    model: 'gemini-3-flash-preview', 
    voiceId: 'v2', 
    phoneNumbers: [], 
    promptTemplate: 'You are an aggressive sales closer. Do not take no for an answer.', 
    temperature: 0.8,
    folderId: 'sales',
    createdAt: new Date().toISOString(),
    firstSentence: "Hey there! This is Mike calling about an exclusive offer.",
    transcriptionLanguage: 'en-US',
    maxDurationSeconds: 300,
    silenceTimeoutSeconds: 1.5,
    interruptionSensitivity: 0.8,
    waitForGreeting: false,
    ghlFieldMapping: { data: {}, tags: {} }
  },
  { 
    id: '3', 
    name: 'Support Bot', 
    role: 'Support', 
    status: 'active', 
    model: 'gemini-3-flash-preview', 
    voiceId: 'v3', 
    phoneNumbers: [], 
    promptTemplate: 'You are a polite support agent. Listen to the user complaint and offer a solution.', 
    temperature: 0.5,
    folderId: 'support',
    createdAt: new Date().toISOString(),
    firstSentence: "Thank you for calling support. Can you describe your issue?",
    transcriptionLanguage: 'en-US',
    maxDurationSeconds: 1200,
    silenceTimeoutSeconds: 2.5,
    interruptionSensitivity: 0.3,
    waitForGreeting: true,
    ghlFieldMapping: { data: {}, tags: {} }
  },
];

export const StorageService = {
  // --- Global Settings ---
  // Gemini key storage removed: MUST be obtained exclusively from process.env.API_KEY

  saveElevenLabsKey: (key: string): void => {
      localStorage.setItem(STORAGE_KEYS.ELEVENLABS_KEY, key);
  },

  getElevenLabsKey: (): string => {
      return localStorage.getItem(STORAGE_KEYS.ELEVENLABS_KEY) || '';
  },

  saveBackendUrl: (url: string): void => {
      localStorage.setItem(STORAGE_KEYS.BACKEND_URL, url);
  },

  getBackendUrl: (): string => {
      return localStorage.getItem(STORAGE_KEYS.BACKEND_URL) || '';
  },

  saveMakeWebhook: (url: string): void => {
      localStorage.setItem(STORAGE_KEYS.MAKE_WEBHOOK, url);
  },

  getMakeWebhook: (): string => {
      return localStorage.getItem(STORAGE_KEYS.MAKE_WEBHOOK) || '';
  },

  // --- Agents ---
  getAgents: (): Agent[] => {
    const data = localStorage.getItem(STORAGE_KEYS.AGENTS);
    if (data) {
        const parsed: Agent[] = JSON.parse(data);
        if (parsed.length > 0 && !parsed[0].ghlFieldMapping) {
            return parsed.map(a => ({
                ...a,
                firstSentence: a.firstSentence || "Hello! How can I help you?",
                transcriptionLanguage: a.transcriptionLanguage || 'en-US',
                maxDurationSeconds: a.maxDurationSeconds || 600,
                silenceTimeoutSeconds: a.silenceTimeoutSeconds || 2.0,
                interruptionSensitivity: a.interruptionSensitivity || 0.5,
                waitForGreeting: a.waitForGreeting ?? true,
                ghlFieldMapping: a.ghlFieldMapping || { data: {}, tags: {} }
            }));
        }
        return parsed;
    }
    return DEFAULT_AGENTS;
  },

  saveAgent: (agent: Agent): void => {
    const agents = StorageService.getAgents();
    const existingIndex = agents.findIndex(a => a.id === agent.id);
    
    if (existingIndex >= 0) {
      agents[existingIndex] = agent;
    } else {
      agents.push(agent);
    }
    
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  },

  deleteAgent: (id: string): void => {
    const agents = StorageService.getAgents().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    
    const numbers = StorageService.getPhoneNumbers();
    const updatedNumbers = numbers.map(n => n.assignedAgentId === id ? { ...n, assignedAgentId: undefined } : n);
    localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(updatedNumbers));
  },

  // --- Folders ---
  getFolders: (): AgentFolder[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return data ? JSON.parse(data) : DEFAULT_FOLDERS;
  },

  saveFolder: (folder: AgentFolder): void => {
    const folders = StorageService.getFolders();
    const index = folders.findIndex(f => f.id === folder.id);
    if (index >= 0) {
        folders[index] = folder;
    } else {
        folders.push(folder);
    }
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  },

  renameFolder: (id: string, name: string): void => {
      const folders = StorageService.getFolders();
      const folder = folders.find(f => f.id === id);
      if (folder) {
          folder.name = name;
          localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      }
  },

  deleteFolder: (id: string): void => {
      const folders = StorageService.getFolders().filter(f => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      
      const agents = StorageService.getAgents().map(a => 
          a.folderId === id ? { ...a, folderId: undefined } : a
      );
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  },

  // --- Connected Accounts ---
  getAccounts: (): ConnectedAccount[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  },

  saveAccount: (account: ConnectedAccount): void => {
    const accounts = StorageService.getAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    if (index >= 0) {
        accounts[index] = account;
    } else {
        accounts.push(account);
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  removeAccount: (id: string): void => {
    const accounts = StorageService.getAccounts().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  // --- Phone Numbers ---
  getPhoneNumbers: (): PhoneNumber[] => {
      const data = localStorage.getItem(STORAGE_KEYS.PHONE_NUMBERS);
      return data ? JSON.parse(data) : DEFAULT_NUMBERS;
  },

  savePhoneNumbers: (numbers: PhoneNumber[]): void => {
      const existing = StorageService.getPhoneNumbers();
      const existingMap = new Map(existing.map(n => [n.id, n]));
      
      const merged = numbers.map(newNum => {
          const prev = existingMap.get(newNum.id);
          return prev ? { ...newNum, assignedAgentId: prev.assignedAgentId } : newNum;
      });
      
      const masterMap = new Map(existing.map(n => [n.id, n]));
      merged.forEach(n => masterMap.set(n.id, n));
      
      localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(Array.from(masterMap.values())));
  },

  replacePhoneNumbers: (numbers: PhoneNumber[]): void => {
    localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(numbers));
  },

  savePhoneNumber: (number: PhoneNumber): void => {
      const numbers = StorageService.getPhoneNumbers();
      const index = numbers.findIndex(n => n.id === number.id);
      if (index >= 0) {
          numbers[index] = number;
      } else {
          numbers.push(number);
      }
      localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(numbers));
  },

  // --- Twilio Credentials ---
  saveTwilioCreds: (creds: TwilioCredential & { isDemo: boolean }): void => {
    localStorage.setItem(STORAGE_KEYS.TWILIO_CREDS, JSON.stringify(creds));
  },

  getTwilioCreds: (): (TwilioCredential & { isDemo: boolean }) | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TWILIO_CREDS);
    return data ? JSON.parse(data) : null;
  },

  removeTwilioCreds: (): void => {
    localStorage.removeItem(STORAGE_KEYS.TWILIO_CREDS);
  },

  // --- Custom Voices ---
  getCustomVoices: (): VoiceProfile[] => {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_VOICES);
      return data ? JSON.parse(data) : [];
  },

  saveCustomVoice: (voice: VoiceProfile): void => {
      const voices = StorageService.getCustomVoices();
      voices.push(voice);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_VOICES, JSON.stringify(voices));
  },

  // --- Logic for Assignment ---
  assignNumberToAgent: (numberId: string, agentId: string): void => {
      const numbers = StorageService.getPhoneNumbers();
      const numIndex = numbers.findIndex(n => n.id === numberId);
      if (numIndex === -1) return;
      
      const oldAgentId = numbers[numIndex].assignedAgentId;
      if (oldAgentId && oldAgentId !== agentId) {
          const oldAgent = StorageService.getAgents().find(a => a.id === oldAgentId);
          if (oldAgent) {
              oldAgent.phoneNumbers = oldAgent.phoneNumbers.filter(nid => nid !== numberId);
              StorageService.saveAgent(oldAgent);
          }
      }

      numbers[numIndex].assignedAgentId = agentId;
      localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(numbers));

      const agents = StorageService.getAgents();
      const agent = agents.find(a => a.id === agentId);
      if (agent && !agent.phoneNumbers.includes(numberId)) {
          agent.phoneNumbers.push(numberId);
          localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
      }
  },

  unassignNumber: (numberId: string): void => {
      const numbers = StorageService.getPhoneNumbers();
      const num = numbers.find(n => n.id === numberId);
      if (!num) return;
      
      const oldAgentId = num.assignedAgentId;
      num.assignedAgentId = undefined;
      localStorage.setItem(STORAGE_KEYS.PHONE_NUMBERS, JSON.stringify(numbers));

      if (oldAgentId) {
          const agents = StorageService.getAgents();
          const agent = agents.find(a => a.id === oldAgentId);
          if (agent) {
              agent.phoneNumbers = agent.phoneNumbers.filter(nid => nid !== numberId);
              localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
          }
      }
  }
};
