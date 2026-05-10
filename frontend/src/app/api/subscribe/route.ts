import { NextResponse } from "next/server";

const BACKEND_API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

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

    const res = await fetch(`${BACKEND_API_BASE}/api/digest/subscribe?email=${encodeURIComponent(email)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
      console.error("Digest subscribe proxy error:", res.status, data?.detail ?? data?.error ?? "unknown");
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to subscribe" },
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
