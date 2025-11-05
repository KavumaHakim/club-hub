import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { GoogleGenAI, Chat as GeminiChat, Content } from "@google/genai";
import * as api from '../services/apiService';
import { SendIcon } from './icons/SendIcon';

// Define message structure
interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatProps {
  currentUser: User;
}

// AI Avatar
const AILogo: React.FC = () => (
    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
      G
    </div>
);

const Chat: React.FC<ChatProps> = ({ currentUser }) => {
  const [chat, setChat] = useState<GeminiChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini Chat with club context
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // 1. Fetch real-time club data
        const [activities, users] = await Promise.all([
            api.getActivities(),
            api.getUsers(),
        ]);

        // 2. Format the data into a context prompt for the AI
        const activityContext = activities.length > 0
            ? activities.map(a => `- ${a.title} on ${a.date} at ${a.location}.`).join('\n')
            : 'No upcoming activities scheduled.';
        
        const memberContext = users.filter(u => u.status === 'APPROVED').length > 0
            ? users.filter(u => u.status === 'APPROVED').map(u => `- ${u.name} (${u.role})`).join('\n')
            : 'No approved members listed.';

        const contextPrompt = `
You have the following information about the ICT Club Naggalama to help you answer questions. This is your knowledge base.

**UPCOMING ACTIVITIES:**
${activityContext}

**CURRENT MEMBERS:**
${memberContext}

Use this information to answer user questions accurately. If you don't have the information from this context, say that you don't have access to that specific detail.
        `;

        // 3. Create a chat history that includes the context
        const history: Content[] = [
            { role: 'user', parts: [{ text: contextPrompt }] },
            { role: 'model', parts: [{ text: `Hi ${currentUser.name}! I'm the club's AI assistant. I've just been updated with the latest on our activities and members. What can I help you with?` }] }
        ];

        // 4. Initialize the AI with the pre-filled history
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
              systemInstruction: 'You are a friendly and helpful AI assistant for the ICT Club Naggalama. Your goal is to assist club members with their questions about club activities, schedules, projects, and general tech topics based on the context provided. Keep your responses concise, encouraging, and positive.',
            },
        });
        
        setChat(chatSession);
        // 5. Set the initial welcome message for the UI, hiding the context prompt
        setMessages([{ role: 'model', text: history[1].parts[0].text }]);

      } catch (e) {
        console.error("Failed to initialize Gemini Chat:", e);
        setError("Could not connect to the AI assistant. Please check your configuration.");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [currentUser.name]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);


  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const stream = await chat.sendMessageStream({ message: userInput });
      
      let modelResponse = '';
      // Add a placeholder for the streaming response
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        // Update the last message in the array with the new chunk
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = modelResponse;
            return newMessages;
        });
      }
    } catch (err: any) {
      console.error("Gemini API error:", err);
      setError("Sorry, I couldn't process that. Please try again.");
      // On error, remove the user's message and the empty model message
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, chat]);

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-12rem)]">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700">Club Assistant Chat</h2>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {isInitializing ? (
                <div className="text-center text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    <p className="mt-4">Waking up the AI assistant...</p>
                </div>
            ) : messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <AILogo />}
                    <div className={`max-w-lg p-3 rounded-lg ${
                        msg.role === 'user' 
                        ? 'bg-pink-500 text-white rounded-br-none' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}>
                        <p className="whitespace-pre-wrap">{msg.text || '...'}</p>
                    </div>
                    {msg.role === 'user' && (
                        <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                    )}
                </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'user' && (
                 <div className="flex items-start gap-3">
                    <AILogo />
                    <div className="max-w-lg p-3 rounded-lg bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                        <div className="flex items-center space-x-1">
                            <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        
        {error && <p className="text-sm text-red-500 text-center px-4 pb-2">{error}</p>}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-grow w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={isInitializing || isLoading || !chat}
                />
                <button
                    type="submit"
                    disabled={isInitializing || isLoading || !userInput.trim() || !chat}
                    className="p-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    aria-label="Send message"
                >
                    <SendIcon />
                </button>
            </form>
        </div>
    </div>
  );
};

export default Chat;