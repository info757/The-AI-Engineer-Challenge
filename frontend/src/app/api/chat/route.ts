import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, model = 'gpt-4o-mini', system_message = 'You are a helpful AI assistant.', demo_mode = true } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only support demo mode
    if (!demo_mode) {
      return NextResponse.json(
        { error: 'Only demo mode is supported' },
        { status: 400 }
      );
    }

    // Use demo mode with default API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Demo mode not available - no default API key configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: system_message },
        { role: 'user', content: message }
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
