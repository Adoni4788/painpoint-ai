import { NextResponse } from "next/server";

const LOOPS_API_URL = "https://app.loops.so/api/v1/contacts/create";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LOOPS_API_KEY;
    if (!apiKey) {
      console.error("LOOPS_API_KEY is not configured");
      return NextResponse.json(
        { error: "Newsletter signup is temporarily unavailable" },
        { status: 503 }
      );
    }

    const res = await fetch(LOOPS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        source: "GapLens Landing Page",
      }),
    });

    const data = (await res.json()) as { success?: boolean; id?: string; message?: string };

    if (!res.ok) {
      // 409 = contact already exists — treat as success (they're already subscribed)
      if (res.status === 409) {
        return NextResponse.json({ success: true });
      }
      console.error("Loops API error:", res.status, data);
      return NextResponse.json(
        { error: data?.message ?? "Failed to subscribe" },
        { status: res.status >= 500 ? 503 : 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
