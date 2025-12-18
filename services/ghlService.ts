

import { GHLCustomField, GHLTag } from "../types";

export interface GHLConfig {
    apiKey: string; // This is the Access Token for V2
    locationId?: string; // Optional context, usually inferred from token or required param
}

export interface GHLContact {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

export interface GHLLocation {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
}

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Mock data for demo mode
const MOCK_CONTACT_RESPONSE = {
    contact: {
        id: "ghl_contact_12345",
        firstName: "NexusVoice",
        lastName: "Test",
        email: "test.connection@nexusvoice.ai",
        phone: "+15550109999",
        tags: ["nexus-integration-test"]
    }
};

const MOCK_CUSTOM_FIELDS: GHLCustomField[] = [
    { id: "cf_recording_url", name: "Call Recording Link", fieldKey: "contact.recording_url", dataType: "TEXT" },
    { id: "cf_transcription", name: "AI Transcription", fieldKey: "contact.ai_transcription", dataType: "LARGE_TEXT" },
    { id: "cf_summary", name: "Call Summary", fieldKey: "contact.call_summary", dataType: "LARGE_TEXT" },
    { id: "cf_duration", name: "Call Duration", fieldKey: "contact.call_duration", dataType: "NUMBER" },
    { id: "cf_sentiment", name: "Call Sentiment", fieldKey: "contact.sentiment", dataType: "TEXT" },
    { id: "cf_outcome", name: "Call Outcome", fieldKey: "contact.outcome", dataType: "TEXT" },
    { id: "cf_appointment_date", name: "Appointment Date", fieldKey: "contact.appt_date", dataType: "DATE" }
];

const MOCK_TAGS: GHLTag[] = [
    { id: "tag_answered", name: "Call Answered" },
    { id: "tag_no_answer", name: "No Answer" },
    { id: "tag_voicemail", name: "Voicemail Left" },
    { id: "tag_lead", name: "Hot Lead" },
    { id: "tag_followup", name: "Needs Follow Up" },
    { id: "tag_inbound", name: "Inbound Call" },
    { id: "tag_outbound", name: "Outbound Call" },
    { id: "tag_busy", name: "Line Busy" },
    { id: "tag_failed", name: "Call Failed" }
];

export const GHLService = {
    /**
     * Validates connection and fetches location details (Name, ID).
     */
    getLocation: async (apiKey: string, locationId: string, isDemo = false): Promise<GHLLocation> => {
        if (isDemo) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            // Return a mock location with a name based on the ID to look dynamic
            const mockName = locationId.length > 5 ? "Summit Dental Care" : "NexusVoice HQ";
            return {
                id: locationId || "loc_demo_123",
                name: mockName,
                city: "Austin",
                state: "TX"
            };
        }

        if (!apiKey || !locationId) throw new Error("API Key (Token) and Location ID are required.");

        try {
            const response = await fetch(`${GHL_API_BASE}/locations/${locationId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28',
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || data.error || 'Failed to fetch location details.';
                throw new Error(errorMessage);
            }

            // Standard GHL V2 response for location fetch is { location: { ... } }
            return data.location;
        } catch (error: any) {
            if (error.message === 'Failed to fetch') {
                throw new Error("Network Error: Could not reach GHL. Check CORS or use Demo Mode.");
            }
            throw error;
        }
    },

    /**
     * Tests the connection by attempting to create a test contact.
     * Uses GHL V2 API standard.
     */
    createTestContact: async (apiKey: string, locationId?: string, isDemo = false): Promise<any> => {
        if (isDemo) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
            return MOCK_CONTACT_RESPONSE;
        }

        if (!apiKey) throw new Error("API Key (Access Token) is required.");

        const payload: any = {
            firstName: "NexusVoice",
            lastName: "Test",
            email: `test.${Date.now()}@nexusvoice.ai`, // Unique email to prevent dupe errors
            phone: "+15550109988",
            tags: ["nexus-integration-test"],
            source: "NexusVoice Dashboard"
        };

        // GHL V2 often requires locationId in the body if the token has access to multiple locations
        if (locationId) {
            payload.locationId = locationId;
        }

        try {
            const response = await fetch(`${GHL_API_BASE}/contacts/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28', // Required for V2 API
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific GHL error formats
                const errorMessage = data.message || data.error || 'Unknown GHL API Error';
                throw new Error(`GHL Error: ${errorMessage}`);
            }

            return data;
        } catch (error: any) {
            // Check for CORS or Network errors which are common in client-side only apps
            if (error.message === 'Failed to fetch') {
                throw new Error("Network Error: Could not reach GHL. If running locally, this is likely a CORS issue. Try enabling 'Demo Mode' to simulate the flow.");
            }
            throw error;
        }
    },

    /**
     * Fetches Custom Fields for mapping.
     */
    getCustomFields: async (apiKey: string, locationId: string, isDemo = false): Promise<GHLCustomField[]> => {
        if (isDemo) {
            await new Promise(r => setTimeout(r, 600));
            return MOCK_CUSTOM_FIELDS;
        }

        const response = await fetch(`${GHL_API_BASE}/locations/${locationId}/customFields`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Version': '2021-07-28',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to fetch custom fields');
        return data.customFields || [];
    },

    /**
     * Fetches Tags for mapping.
     */
    getTags: async (apiKey: string, locationId: string, isDemo = false): Promise<GHLTag[]> => {
        if (isDemo) {
            await new Promise(r => setTimeout(r, 600));
            return MOCK_TAGS;
        }
        
        const response = await fetch(`${GHL_API_BASE}/locations/${locationId}/tags`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Version': '2021-07-28',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to fetch tags');
        return data.tags || [];
    }
};