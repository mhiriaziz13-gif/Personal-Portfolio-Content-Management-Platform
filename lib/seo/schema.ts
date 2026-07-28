import type {
  CertificationContent,
  ProfileContent,
  ProjectContent,
} from "@/lib/cms-types";
import { siteSeo } from "@/lib/seo/config";
import { absoluteUrl, resolveMediaUrl } from "@/lib/seo/urls";

export const personSchema = (profile: ProfileContent) => ({
  "@type": "Person", "@id": `${siteSeo.url}/#person`, name: profile.name, url: siteSeo.url,
  ...(profile.avatarPath ? { image: resolveMediaUrl(profile.avatarPath) } : {}),
  ...(profile.shortProfile ? { description: profile.shortProfile } : {}),
  ...(profile.mainTitle ? { jobTitle: profile.mainTitle } : {}),
  sameAs: [profile.linkedIn, profile.github].filter(Boolean),
  ...(profile.location ? { homeLocation: { "@type": "Place", name: profile.location } } : {}),
  knowsAbout: ["Marketing analytics", "Commercial analytics", "Business intelligence", "Customer insights", "Process automation"],
  alumniOf: { "@type": "CollegeOrUniversity", name: "Institut des Hautes Études Commerciales de Carthage — IHEC Carthage" },
});

export const websiteSchema = () => ({ "@type": "WebSite", "@id": `${siteSeo.url}/#website`, url: siteSeo.url, name: siteSeo.siteName, inLanguage: "en", publisher: { "@id": `${siteSeo.url}/#person` } });
export const breadcrumbSchema = (items: { name: string; href: string }[]) => ({ "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.href) })) });
export const profilePageSchema = (profile: ProfileContent) => ({
  "@type": "ProfilePage",
  "@id": `${siteSeo.url}/#profile-page`,
  url: siteSeo.url,
  name: siteSeo.siteName,
  mainEntity: { "@id": `${siteSeo.url}/#person` },
  ...(profile.shortProfile ? { description: profile.shortProfile } : {}),
  isPartOf: { "@id": `${siteSeo.url}/#website` },
  inLanguage: "en",
});

const isVermegTeamPrototype = (project: ProjectContent) =>
  project.slug === "vermeg-ai-ready-e-learning-platform"
  || project.slug === "ai-ready-elearning-platform";

export const projectSchema = (project: ProjectContent) => {
  const personReference = { "@id": `${siteSeo.url}/#person` };
  const attribution = isVermegTeamPrototype(project)
    ? { contributor: personReference }
    : { creator: personReference, author: personReference };

  return {
    "@type": "CreativeWork",
    "@id": `${absoluteUrl(`/projects/${project.slug}`)}#project`,
    name: project.title,
    headline: project.title,
    description: project.description,
    url: absoluteUrl(`/projects/${project.slug}`),
    image: resolveMediaUrl(project.image),
    ...attribution,
    keywords: project.tags,
    creativeWorkStatus: "Published",
    ...(project.createdAt ? { dateCreated: project.createdAt } : {}),
    ...(project.updatedAt ? { dateModified: project.updatedAt } : {}),
    isPartOf: { "@id": `${siteSeo.url}/#website` },
    mainEntityOfPage: absoluteUrl(`/projects/${project.slug}`),
  };
};

export const credentialSchema = (
  certification: CertificationContent,
  index: number,
) => ({
  "@type": "EducationalOccupationalCredential",
  "@id": `${absoluteUrl("/certifications")}#credential-${index + 1}`,
  name: certification.name,
  ...(certification.description
    ? { description: certification.description }
    : {}),
  ...(certification.issuer
    ? {
        recognizedBy: {
          "@type": "Organization",
          name: certification.issuer,
        },
      }
    : {}),
  ...(certification.credentialId
    ? { identifier: certification.credentialId }
    : {}),
  ...(certification.credentialUrl
    ? { url: certification.credentialUrl }
    : {}),
  credentialCategory: "Professional certification",
});
