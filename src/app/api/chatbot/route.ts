import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simple in-memory conversation cache
const conversationHistory = new Map<string, Array<{ role: string; content: string }>>();

const HOTEL_CONTEXT = `You are the AI assistant for Royal Loft Hotel, a luxury hotel in Nigeria. 
Your name is "Royal Loft Concierge".

Hotel Information:
- Check-in time: 2:00 PM
- Check-out time: 12:00 PM (noon)
- Breakfast: Complimentary breakfast is included for Suite and Presidential rooms. Standard and Deluxe rooms have breakfast available for ₦5,000 per person.
- Gym: Yes, we have a fully equipped fitness center open 6:00 AM to 10:00 PM
- Pool: Outdoor pool open 7:00 AM to 8:00 PM
- WiFi: Complimentary high-speed WiFi in all rooms and public areas
- Restaurant: Open 6:30 AM to 11:00 PM
- Room Service: Available 24/7
- Bar/Lounge: Open 5:00 PM to 12:00 AM
- Spa: Available by appointment, 9:00 AM to 8:00 PM
- Laundry: Same-day service available, pickup by 9:00 AM
- Parking: Free secure parking for all guests
- Airport Shuttle: Available on request (fee applies)
- Currency: Nigerian Naira (₦)

Room Types and Rates:
- Standard Room: ₦15,000/night
- Deluxe Room: ₦25,000/night  
- Suite: ₦45,000/night
- Presidential Suite: ₦80,000/night

Payment Methods: Cash, POS/Card, Bank Transfer, OPay, PalmPay, Moniepoint

Always be polite, helpful, and professional. If you don't know something specific, suggest the guest contact the front desk at extension 0 or visit the reception. Keep responses concise but informative.`;

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 });
    }

    // Get conversation history
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, [
        { role: 'system', content: HOTEL_CONTEXT },
      ]);
    }

    const history = conversationHistory.get(sessionId)!;
    history.push({ role: 'user', content: message });

    // Keep only last 20 messages + system prompt to avoid token overflow
    if (history.length > 21) {
      const systemPrompt = history[0];
      const recent = history.slice(-20);
      conversationHistory.set(sessionId, [systemPrompt, ...recent]);
    }

    // Use z-ai-web-dev-sdk for AI response
    let aiResponse: string;
    try {
      const { LLM } = await import('z-ai-web-dev-sdk');
      const currentHistory = conversationHistory.get(sessionId) || [];
      const response = await LLM.chat({
        messages: currentHistory.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500,
      });
      aiResponse = response.choices?.[0]?.message?.content || response.content || "I'm sorry, I couldn't process your request. Please try again or contact our front desk.";
    } catch {
      aiResponse = "I apologize, but I'm having trouble connecting to my AI service. Please contact our front desk at extension 0 for immediate assistance. They're available 24/7 to help you.";
    }

    history.push({ role: 'assistant', content: aiResponse });

    // Save to database (fire and forget)
    db.chatbotConversation.create({
      data: {
        sessionId,
        message,
        response: aiResponse,
        intent: guessIntent(message),
      },
    }).catch(() => {});

    return NextResponse.json({ response: aiResponse });
  } catch (error: unknown) {
    console.error('Chatbot error:', error);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}

function guessIntent(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('checkout') || lower.includes('check out') || lower.includes('leave')) return 'checkout_time';
  if (lower.includes('breakfast') || lower.includes('food') || lower.includes('eat') || lower.includes('restaurant') || lower.includes('menu')) return 'breakfast';
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('exercise') || lower.includes('workout') || lower.includes('pool') || lower.includes('spa')) return 'amenities';
  if (lower.includes('wifi') || lower.includes('internet') || lower.includes('connection')) return 'amenities';
  if (lower.includes('book') || lower.includes('reserve') || lower.includes('room') || lower.includes('available') || lower.includes('price') || lower.includes('rate')) return 'booking';
  if (lower.includes('direction') || lower.includes('location') || lower.includes('address') || lower.includes('where')) return 'directions';
  if (lower.includes('payment') || lower.includes('pay') || lower.includes('card') || lower.includes('cash')) return 'payment';
  return 'other';
}
