import { getPortfolioContent } from "@/lib/cms";
import { createLlmsText } from "@/lib/seo/discoverability";

export const revalidate = 60;

export async function GET() {
  let content: Awaited<ReturnType<typeof getPortfolioContent>> | null = null;
  try {
    content = await getPortfolioContent();
  } catch {
    console.warn(
      "llms.txt CMS read failed; omitting unconfirmed publication entries.",
    );
  }

  return new Response(createLlmsText(content), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
