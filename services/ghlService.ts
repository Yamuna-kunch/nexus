
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

export const GHLService = {
    /**
     * Validates connection and fetches location details (Name, ID).
     */
    getLocation: async (apiKey: string, locationId: string): Promise<GHLLocation> => {
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

            return data.location;
        } catch (error: any) {
            if (error.message === 'Failed to fetch') {
                throw new Error("Network Error: Could not reach GHL. Check CORS.");
            }
            throw error;
        }
    },

    /**
     * Tests the connection by attempting to create a test contact.
     * Uses GHL V2 API standard.
     */
    createTestContact: async (apiKey: string, locationId?: string): Promise<any> => {
        if (!apiKey) throw new Error("API Key (Access Token) is required.");

        const payload: any = {
            firstName: "NexusVoice",
            lastName: "Test",
            email: `test.${Date.now()}@nexusvoice.ai`, // Unique email to prevent dupe errors
            phone: "+15550109988",
            tags: ["nexus-integration-test"],
            source: "NexusVoice Dashboard"
        };

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
                const errorMessage = data.message || data.error || 'Unknown GHL API Error';
                throw new Error(`GHL Error: ${errorMessage}`);
            }

            return data;
        } catch (error: any) {
            if (error.message === 'Failed to fetch') {
                throw new Error("Network Error: Could not reach GHL. If running locally, this is likely a CORS issue.");
            }
            throw error;
        }
    },

    /**
     * Fetches Custom Fields for mapping.
     */
    getCustomFields: async (apiKey: string, locationId: string): Promise<GHLCustomField[]> => {
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
    getTags: async (apiKey: string, locationId: string): Promise<GHLTag[]> => {
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
