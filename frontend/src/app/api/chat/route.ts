import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { developer_message, user_message, model = 'gpt-4o-mini', use_demo_mode } = body;

    if (!developer_message || !user_message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if demo mode is available
    if (use_demo_mode && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Demo mode not available - no API key configured' },
        { status: 500 }
      );
    }

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: developer_message },
        { role: 'user', content: user_message }
      ],
      stream: true,
    });

    // Convert to ReadableStream for streaming response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
