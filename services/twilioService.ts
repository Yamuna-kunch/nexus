
import { TwilioCredential, TwilioPhoneNumber } from "../types";

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

// Helper to encode credentials for Basic Auth
const getAuthHeaders = (creds: TwilioCredential) => ({
  'Authorization': 'Basic ' + btoa(`${creds.accountSid}:${creds.authToken}`),
  'Content-Type': 'application/x-www-form-urlencoded'
});

// Map internal Voice IDs to the best available Twilio Voices.
export const mapVoiceIdToTwilio = (voiceId: string): string => {
    switch(voiceId) {
        case 'v1': return 'Polly.Joanna-Neural'; 
        case 'v2': return 'Polly.Matthew-Neural';
        case 'v3': return 'Polly.Amy-Neural';
        case 'v4': return 'Polly.Arthur-Neural';
        case 'v5': return 'Polly.Olivia-Neural'; 
        case 'v6': return 'Polly.William-Neural';
        case 'v7': return 'Polly.Kajal-Neural'; 
        case 'v8': return 'Polly.Aditi-Neural'; 
        default: return 'Polly.Joanna-Neural';
    }
};

export const TwilioService = {
  validate: async (creds: TwilioCredential) => {
    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}.json`, {
      method: 'GET',
      headers: getAuthHeaders(creds)
    });
    if (!response.ok) throw new Error('Authentication failed');
    return await response.json();
  },

  getIncomingNumbers: async (creds: TwilioCredential) => {
    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json?PageSize=20`, {
      method: 'GET',
      headers: getAuthHeaders(creds)
    });
    if (!response.ok) throw new Error('Failed to fetch numbers');
    return await response.json();
  },

  searchAvailableNumbers: async (creds: TwilioCredential, country: string, areaCode?: string) => {
    let url = `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/AvailablePhoneNumbers/${country}/Local.json?PageSize=12`;
    if (areaCode) url += `&AreaCode=${areaCode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(creds)
    });
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  },

  buyNumber: async (creds: TwilioCredential, phoneNumber: string) => {
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
   */
  initiateOutboundCall: async (
      creds: TwilioCredential, 
      fromNumber: string, 
      toNumber: string, 
      agentName: string, 
      firstSentence: string,
      voiceId: string,
      customBackendUrl?: string
  ) => {
      const twilioVoice = mapVoiceIdToTwilio(voiceId);
      let callHandlerUrl = '';

      if (customBackendUrl) {
          const baseUrl = customBackendUrl.replace(/\/$/, ''); 
          const params = new URLSearchParams({
              agentName,
              firstSentence,
              voice: twilioVoice,
          });
          callHandlerUrl = `${baseUrl}/nexus-agent?${params.toString()}`;
      } else {
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
