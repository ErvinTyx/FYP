import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Wrap handlers with error handling to ensure JSON responses
async function handleWithErrorCatch(
  handler: ((req: NextRequest) => Promise<Response>) | undefined,
  req: NextRequest
): Promise<Response> {
  try {
    // Validate AUTH_SECRET is set
    if (!process.env.AUTH_SECRET) {
      console.error("[Auth] AUTH_SECRET environment variable is not set");
      return NextResponse.json(
        { 
          error: "Server configuration error", 
          message: "AUTH_SECRET environment variable is missing. Please set it in your .env file." 
        },
        { status: 500 }
      );
    }

    // Validate handlers are available
    if (!handlers) {
      console.error("[Auth] NextAuth handlers are not available");
      return NextResponse.json(
        { 
          error: "Server configuration error", 
          message: "NextAuth handlers are not available. Check your AUTH_SECRET and database configuration." 
        },
        { status: 500 }
      );
    }

    if (!handler) {
      return NextResponse.json(
        { error: "Handler not available" },
        { status: 405 }
      );
    }

    const response = await handler(req);
    return response;
  } catch (error) {
    console.error("[Auth] Handler error:", error);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("[Auth] Error stack:", error.stack);
    }
    
    // Ensure we always return JSON, not HTML
    return NextResponse.json(
      {
        error: "Authentication error",
        message: error instanceof Error ? error.message : "Unknown error",
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleWithErrorCatch(handlers?.GET, req);
}

export async function POST(req: NextRequest) {
  return handleWithErrorCatch(handlers?.POST, req);
}
