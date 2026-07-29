import Image from "next/image";
import { FaCertificate } from "react-icons/fa6";

import type { CertificationContent } from "@/lib/cms-types";

const isSupportedImageSource = (source: string) =>
  (source.startsWith("/") && !source.startsWith("//")) ||
  source.startsWith("https://");

export const CertificationArtwork = ({
  certification,
}: {
  certification: CertificationContent;
}) => {
  const imageUrl = certification.imageUrl?.trim() ?? "";
  const showImage = isSupportedImageSource(imageUrl);

  return (
    <div
      className="relative flex h-44 items-center justify-center overflow-hidden border-b border-white/10 bg-gradient-to-br from-purple-500/20 via-[#100b24] to-cyan-400/10"
      data-image-fallback-container
    >
      {showImage ? (
        <>
          <Image
            src={imageUrl}
            alt={
              certification.issuer.trim()
                ? `${certification.name} certification issued by ${certification.issuer}`
                : `${certification.name} certification`
            }
            fill
            sizes="(min-width: 1280px) 405px, (min-width: 768px) calc(50vw - 36px), calc(100vw - 48px)"
            className="object-contain p-3 transition duration-500 group-hover:scale-[1.03]"
            data-image-fallback="hide"
          />
          <div
            className="hidden h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_32px_rgba(103,232,249,0.18)] flex"
            data-image-fallback-content
          >
            <FaCertificate className="h-9 w-9" aria-hidden="true" />
          </div>
        </>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_32px_rgba(103,232,249,0.18)]">
          <FaCertificate className="h-9 w-9" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
