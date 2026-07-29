import Image from "next/image";

import type { ProfileContent } from "@/lib/cms-types";

export const AvatarArtwork = ({ profile }: { profile: ProfileContent }) => {
  const showAvatar = Boolean(profile.avatarPath);

  if (!showAvatar) {
    return (
      <span className="flex h-full w-full items-center justify-center text-5xl font-bold text-white">
        {profile.initials}
      </span>
    );
  }

  return (
    <span className="contents" data-image-fallback-container>
      <Image
        src={profile.avatarPath}
        alt={profile.name}
        fill
        sizes="328px"
        className="object-cover"
        data-image-fallback="hide"
      />
      <span
        className="hidden h-full w-full items-center justify-center text-5xl font-bold text-white flex"
        data-image-fallback-content
      >
        {profile.initials}
      </span>
    </span>
  );
};
