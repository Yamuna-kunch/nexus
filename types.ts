
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface GHLCustomField {
    id: string;
    name: string;
    fieldKey: string;
    dataType: string;
}

export interface GHLTag {
    id: string;
    name: string;
}

export interface TriggerPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  source?: string;
}

export interface VoiceProfile {
    id: string;
    name: string;
    gender: 'male' | 'female' | 'unknown';
    lang: string;
    flag: string;
    category: 'standard' | 'cloned';
    previewUrl?: string; // For cloned voices, the uploaded sample
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'draft';
  model: string;
  voiceId: string;
  phoneNumbers: string[]; // IDs of assigned numbers
  promptTemplate: string;
  temperature: number;
  ghlLocationId?: string; // Link to specific GHL sub-account
  folderId?: string;      // Organization folder
  createdAt: string;

  // Advanced Configuration
  firstSentence: string;
  transcriptionLanguage: string;
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  interruptionSensitivity: number; // 0.0 to 1.0
  waitForGreeting: boolean;

  // GHL Field Mapping
  ghlFieldMapping?: {
      data: {
          recording?: string;
          transcription?: string;
          summary?: string;
          duration?: string;
          sentiment?: string;
          outcome?: string;
      };
      tags: {
          answered?: string;
          inactivity?: string;
          noAnswer?: string;
          voicemail?: string;
          userHangup?: string;
          failed?: string;
          transfer?: string;
          busy?: string;
          inbound?: string;
          outbound?: string;
      };
  };
}

export interface AgentFolder {
  id: string;
  name: string;
  icon?: string; 
}

export interface PhoneNumber {
  id: string;
  number: string;
  country: string;
  capabilities: ('voice' | 'sms' | 'mms')[];
  assignedAgentId?: string;
  status: 'active' | 'released';
  friendlyName?: string;
}

export interface CallLog {
  id: string;
  agentId: string;
  agentName: string;
  customerPhone: string;
  status: 'completed' | 'missed' | 'failed' | 'ongoing';
  durationSeconds: number;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  transcriptSnippet: string;
}

export interface IntegrationConfig {
  ghlApiKey: string;
  webhookUrl: string;
  webhookEvents: string[];
  syncEnabled: boolean;
}

export interface ConnectedAccount {
    id: string; // Internal unique ID for the list
    locationId: string;
    locationName: string;
    apiKey: string;
    connectedAt: string; // ISO string
    lastTestStatus?: 'success' | 'error';
    lastTestMessage?: string;
}

export interface TwilioCredential {
  accountSid: string;
  authToken: string;
}

export interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  lata?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}
