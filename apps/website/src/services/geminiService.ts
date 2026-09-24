import { GoogleGenAI, Chat } from "@google/genai";

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
You are "GNK Connect AI", the intelligent AI travel advisor for "GNK Connect" (a premier travel & tourism company).
Your goal is to assist users in planning trips, selecting executive Umrah packages, understanding sticker visa requirements, and discovering tours.

Key Services Provided by GNK Connect:
- Executive Umrah Packages (Economy $950, Executive 5-star $1,800, Premium Group $1,200)
- Visit Visas & Sticker Visas (UAE/Dubai $150, Thailand $80, Schengen File Preparation $200)
- Luxury & Budget Hotel Bookings (Domestic & International)
- Airline Tickets & Corporate Fares
- Domestic Tours (Naran & Kaghan, Babusar Top, Skardu Valley, Hunza Valley)
- International Tours (Dubai/UAE, Vietnam, Singapore, Malaysia, Thailand, Indonesia, Egypt, Sri Lanka, China)
- Comprehensive Travel Insurance (Schengen & Worldwide)

Company Info:
- Phone: +92 51 6137232
- Email: info@gnkconnect.com
- Address: Office #2, Mezzanine Floor, Junaid Plaza, Islamabad, Pakistan

Tone: Executive, warm, professional, and knowledgeable.
Keep responses concise, clear, and action-oriented.
Guide users to contact our consultants or visit the specific service page to proceed with bookings.
`;

const getLocalAssistantResponse = (query: string): string => {
  const q = query.toLowerCase();
  if (q.includes('umrah') || q.includes('makkah') || q.includes('madinah')) {
    return "At GNK Connect, we offer Executive Umrah packages starting from $950 (Economy 15 Days) up to 5-star VIP packages at the Clock Tower ($1,800 for 10 Days) with private transport, visa, and guided Ziarat. Would you like us to arrange a tailored package?";
  }
  if (q.includes('visa') || q.includes('sticker') || q.includes('passport') || q.includes('schengen')) {
    return "GNK Connect provides full visa processing services including UAE E-Visas ($150, 3-4 days), Thailand Sticker Visas ($80), and complete Schengen file preparation with mock interview sessions ($200). Visit our Services page to submit your inquiry!";
  }
  if (q.includes('skardu') || q.includes('naran') || q.includes('hunza') || q.includes('domestic') || q.includes('north')) {
    return "Our Northern Pakistan tours cover Naran & Babusar (5 Days, $545), Skardu Valley Adventure (7 Days, $650), and Hunza Valley Executive (6 Days, $800) with luxury 4x4 transport and verified family accommodations.";
  }
  if (q.includes('dubai') || q.includes('malaysia') || q.includes('singapore') || q.includes('thailand') || q.includes('international')) {
    return "We arrange curated international getaways to Dubai (5 Days, from $800), Malaysia & Singapore (7 Days, $1,500), Thailand (6 Days, $900), Vietnam, and more, complete with 4-star hotels, transfers, and sightseeing!";
  }
  if (q.includes('contact') || q.includes('phone') || q.includes('call') || q.includes('address') || q.includes('email') || q.includes('office')) {
    return "You can reach GNK Connect directly at +92 51 6137232 or via email at info@gnkconnect.com. Our office is located at Office #2, Mezzanine Floor, Junaid Plaza, Islamabad.";
  }
  if (q.includes('flight') || q.includes('ticket') || q.includes('airline') || q.includes('hotel')) {
    return "GNK Connect offers competitive domestic and international flight ticketing with seat & meal management, alongside exclusive partner rates for 3-star to 5-star hotels worldwide.";
  }
  return "Welcome to GNK Connect! I can help you explore Executive Umrah packages, sticker visas, flight bookings, and domestic or international tours. How can I assist your travel plans today?";
};

export const initializeChat = (): boolean => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || 
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

  if (!apiKey) {
    return false;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    return true;
  } catch (error) {
    console.warn("Could not initialize Gemini remote session, using intelligent assistant engine:", error);
    chatSession = null;
    return false;
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    const initialized = initializeChat();
    if (!initialized || !chatSession) {
      // Return smart local fallback
      return getLocalAssistantResponse(message);
    }
  }

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || getLocalAssistantResponse(message);
  } catch (error) {
    console.warn("Gemini API request failed, falling back to local assistant:", error);
    return getLocalAssistantResponse(message);
  }
};
