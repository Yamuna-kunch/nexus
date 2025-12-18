
import { VoiceProfile } from '../types';

const API_BASE = 'https://api.elevenlabs.io/v1';

export const ElevenLabsService = {
    /**
     * Fetch available voices from ElevenLabs
     */
    getVoices: async (apiKey: string): Promise<VoiceProfile[]> => {
        if (!apiKey) return [];

        try {
            const response = await fetch(`${API_BASE}/voices`, {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch voices');

            const data = await response.json();
            
            return data.voices.map((v: any) => ({
                id: v.voice_id,
                name: v.name,
                gender: v.labels?.gender || 'unknown',
                lang: 'en-US', // ElevenLabs voices are often multilingual, defaulting to US context
                flag: '🗣️',
                category: v.category === 'cloned' ? 'cloned' : 'standard',
                previewUrl: v.preview_url
            }));
        } catch (error) {
            console.error('ElevenLabs fetch error:', error);
            throw error;
        }
    },

    /**
     * Generate Audio from Text
     */
    textToSpeech: async (apiKey: string, voiceId: string, text: string): Promise<string> => {
        if (!apiKey) throw new Error("API Key required");

        const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2", // Updated to v2 to support Free Tier and better quality
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail?.message || 'TTS Generation Failed');
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    },

    /**
     * Instant Voice Cloning
     */
    addVoice: async (apiKey: string, name: string, file: File): Promise<VoiceProfile> => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('files', file);
        formData.append('description', 'Cloned via NexusVoice Dashboard');

        const response = await fetch(`${API_BASE}/voices/add`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                // Do NOT set Content-Type header manually for FormData, browser does it with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail?.message || 'Voice cloning failed');
        }

        const data = await response.json();
        
        return {
            id: data.voice_id,
            name: name,
            gender: 'unknown',
            lang: 'en-US',
            flag: '🧬',
            category: 'cloned'
        };
    }
};
