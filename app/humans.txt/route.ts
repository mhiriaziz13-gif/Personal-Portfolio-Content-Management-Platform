import { getPortfolioChromeContent } from "@/lib/cms";

export const revalidate = 60;

export async function GET() {
  const { profile } = await getPortfolioChromeContent();
  const lines = [
    `Owner: ${profile.name || "Ahmed Aziz Mhiri"}`,
    "Purpose: Data-driven marketing, commercial analytics and business intelligence portfolio",
    "Availability: International full-time from October 2027; selected freelance projects now",
    "Technology: Next.js, TypeScript, Supabase, Vercel",
    ...(profile.linkedIn ? [`LinkedIn: ${profile.linkedIn}`] : []),
    ...(profile.github ? [`GitHub: ${profile.github}`] : []),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
