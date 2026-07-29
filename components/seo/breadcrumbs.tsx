import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return <><nav aria-label="Breadcrumb" className="text-sm text-gray-400"><ol className="flex flex-wrap gap-2">{items.map((item, index) => <li key={item.href} className="flex min-h-11 items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{index === items.length - 1 ? <span aria-current="page" className="text-gray-200">{item.name}</span> : <Link href={item.href} className="inline-flex min-h-11 items-center rounded-md hover:text-cyan-100">{item.name}</Link>}</li>)}</ol></nav><JsonLd data={breadcrumbSchema(items)} /></>;
}
