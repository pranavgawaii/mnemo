import { createDemoApi } from "@/lib/server/demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function demo() {
  return createDemoApi({
    url: process.env.MNEMO_DEMO_API_URL,
    key: process.env.MNEMO_DEMO_API_KEY,
  });
}
export function GET(request: Request) {
  return demo().GET(request);
}
export function POST(request: Request) {
  return demo().POST(request);
}
