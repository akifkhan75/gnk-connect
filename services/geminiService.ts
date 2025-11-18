import { GoogleGenAI, Chat } from "@google/genai";
import { ChatMessage } from "../types";

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
You are "Explorer", the intelligent AI travel assistant for the website "ExperienceTravel".
Your goal is to assist users in planning trips, understanding services, and answering queries about ExperienceTravel.

Key Services Provided by ExperienceTravel:
- Executive Umrah Packages
- Visit Visas (Sticker Visas)
- Hotel Bookings (Domestic & International)
- Airline Tickets
- Domestic Tours (Naran, Babusar, Skardu, etc.)
- International Tours (Vietnam, Singapore, Malaysia, UAE, Thailand, Indonesia, Egypt, Sri Lanka, China)
- Travel Insurance

Company Info:
- Phone: 0516137232
- Email: info@explorexperiencetravels.com
- Address: Office #2, Mezzanine floor, Junaid plaza, Islamabad

Tone: Professional, warm, enthusiastic, and helpful.
Keep responses concise (under 100 words unless detailed itinerary is requested).
If asked to book, guide them to the 'Contact Us' page or ask for their details to forward to a human agent.
`;

export const initializeChat = () => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing.");
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  } catch (error) {
    console.error("Failed to initialize Gemini chat:", error);
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    initializeChat();
    if (!chatSession) return "I'm currently offline. Please check the contact page.";
  }

  try {
    const result = await chatSession!.sendMessage({ message });
    return result.text || "I didn't understand that. Could you rephrase?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting right now. Please call us directly.";
  }
};
