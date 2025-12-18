
import { TwilioCredential, TwilioPhoneNumber } from "../types";

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

// Helper to encode credentials for Basic Auth
const getAuthHeaders = (creds: TwilioCredential) => ({
  'Authorization': 'Basic ' + btoa(`${creds.accountSid}:${creds.authToken}`),
  'Content-Type': 'application/x-www-form-urlencoded'
});

// Map internal Voice IDs to the best available Twilio Voices.
// We use 'Polly.Joanna-Neural' (Amazon) and 'Google.en-US-Neural2-C' (Google) 
// as they currently offer the most human-like latency/quality ratio for <Say>.
export const mapVoiceIdToTwilio = (voiceId: string): string => {
    switch(voiceId) {
        // Female US (Soft, Natural)
        case 'v1': return 'Polly.Joanna-Neural'; 
        // Male US (Deep, Professional)
        case 'v2': return 'Polly.Matthew-Neural';
        // Female UK (British, Clear)
        case 'v3': return 'Polly.Amy-Neural';
        // Male UK (British, Formal)
        case 'v4': return 'Polly.Arthur-Neural';
        // Female AU
        case 'v5': return 'Polly.Olivia-Neural'; 
        // Male AU
        case 'v6': return 'Polly.William-Neural';
        // Female IN
        case 'v7': return 'Polly.Kajal-Neural'; 
        // Male IN
        case 'v8': return 'Polly.Aditi-Neural'; 
        // Default Fallback
        default: return 'Polly.Joanna-Neural';
    }
};

// Mock Data for Demo Mode - Using snake_case to match real Twilio API
const MOCK_INCOMING_NUMBERS: any[] = [
  { sid: 'PN1', phone_number: '+14155550101', friendly_name: '(415) 555-0101', iso_country: 'US', capabilities: { voice: true, SMS: true, MMS: false } },
  { sid: 'PN2', phone_number: '+15125550199', friendly_name: '(512) 555-0199', iso_country: 'US', capabilities: { voice: true, SMS: true, MMS: true } },
];

// Mock Available Numbers
const MOCK_AVAILABLE_NUMBERS: any[] = [
  { phone_number: '+14155551001', friendly_name: '(415) 555-1001', locality: 'San Francisco', region: 'CA', iso_country: 'US', capabilities: { voice: true, SMS: true, MMS: true } },
  { phone_number: '+14155551002', friendly_name: '(415) 555-1002', locality: 'San Francisco', region: 'CA', iso_country: 'US', capabilities: { voice: true, SMS: true, MMS: true } },
  { phone_number: '+14155551003', friendly_name: '(415) 555-1003', locality: 'San Francisco', region: 'CA', iso_country: 'US', capabilities: { voice: true, SMS: true, MMS: true } },
  { phone_number: '+442071234567', friendly_name: '+44 20 7123 4567', locality: 'London', region: '', iso_country: 'GB', capabilities: { voice: true, SMS: true, MMS: false } },
];

export const TwilioService = {
  validate: async (creds: TwilioCredential, isDemo = false) => {
    if (isDemo) return { sid: creds.accountSid, friendly_name: 'Demo Account', status: 'active', balance: '50.00' };

    try {
      const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}.json`, {
        method: 'GET',
        headers: getAuthHeaders(creds)
      });
      if (!response.ok) throw new Error('Authentication failed');
      return await response.json();
    } catch (error) {
      console.warn("Twilio API Error (likely CORS). Switching to demo behavior suggestion.");
      throw error;
    }
  },

  getIncomingNumbers: async (creds: TwilioCredential, isDemo = false) => {
    if (isDemo) {
        return { incoming_phone_numbers: MOCK_INCOMING_NUMBERS };
    }

    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json?PageSize=20`, {
      method: 'GET',
      headers: getAuthHeaders(creds)
    });
    if (!response.ok) throw new Error('Failed to fetch numbers');
    return await response.json();
  },

  searchAvailableNumbers: async (creds: TwilioCredential, country: string, areaCode?: string, isDemo = false) => {
    if (isDemo) {
        await new Promise(r => setTimeout(r, 800)); 
        return { 
            available_phone_numbers: MOCK_AVAILABLE_NUMBERS.filter(n => n.iso_country === country) 
        };
    }

    let url = `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/AvailablePhoneNumbers/${country}/Local.json?PageSize=12`;
    if (areaCode) url += `&AreaCode=${areaCode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(creds)
    });
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  },

  buyNumber: async (creds: TwilioCredential, phoneNumber: string, isDemo = false) => {
    if (isDemo) {
        await new Promise(r => setTimeout(r, 1200));
        const num = MOCK_AVAILABLE_NUMBERS.find(n => n.phone_number === phoneNumber);
        if (num) {
            MOCK_INCOMING_NUMBERS.push({ 
                sid: `PN${Math.random().toString(36).substr(2, 9)}`, 
                phone_number: num.phone_number, 
                friendly_name: num.friendly_name,
                iso_country: num.iso_country,
                capabilities: num.capabilities
            });
        }
        return { sid: 'mock_sid', ...num };
    }

    const body = new URLSearchParams();
    body.append('PhoneNumber', phoneNumber);
    
    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: getAuthHeaders(creds),
      body: body
    });
    if (!response.ok) throw new Error('Purchase failed');
    return await response.json();
  },

  /**
   * Initiates an outbound call via Twilio.
   * If `customBackendUrl` is provided, we use that for the TwiML webhook.
   * Otherwise, we fallback to a static TwiML echo (less capable).
   */
  initiateOutboundCall: async (
      creds: TwilioCredential, 
      fromNumber: string, 
      toNumber: string, 
      agentName: string, 
      firstSentence: string,
      voiceId: string,
      isDemo = false,
      customBackendUrl?: string
  ) => {
      if (isDemo) {
          await new Promise(r => setTimeout(r, 2000));
          return { sid: 'CA_MOCK_CALL_SID_' + Date.now(), status: 'queued' };
      }

      // 1. Determine Voice
      const twilioVoice = mapVoiceIdToTwilio(voiceId);

      // 2. Construct Url
      let callHandlerUrl = '';

      if (customBackendUrl) {
          // If the user has provided their own backend, use it!
          // We append parameters so the backend knows what agent to simulate.
          const baseUrl = customBackendUrl.replace(/\/$/, ''); // remove trailing slash
          const params = new URLSearchParams({
              agentName,
              firstSentence,
              voice: twilioVoice,
          });
          callHandlerUrl = `${baseUrl}/nexus-agent?${params.toString()}`;
      } else {
          // Fallback: Echo TwiML (Client-side simulation limitation)
          const fallbackTwiML = `
            <Response>
                <Pause length="1"/>
                <Say voice="${twilioVoice}">${firstSentence}</Say>
                <Gather input="speech" action="http://twimlets.com/echo?Twiml=${encodeURIComponent('<Response><Say>Please configure a backend URL in Integrations to enable AI responses.</Say></Response>')}" timeout="5">
                    <Pause length="10"/>
                </Gather>
                <Say voice="${twilioVoice}">Goodbye.</Say>
            </Response>
          `.trim();
          callHandlerUrl = `http://twimlets.com/echo?Twiml=${encodeURIComponent(fallbackTwiML)}`;
      }

      const body = new URLSearchParams();
      body.append('To', toNumber);
      body.append('From', fromNumber);
      body.append('Url', callHandlerUrl);

      const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}/Calls.json`, {
          method: 'POST',
          headers: getAuthHeaders(creds),
          body: body
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed to initiate call');
      }

      return await response.json();
  }
};
