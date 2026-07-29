import "server-only";

const MINIMUM_PRIVACY_SECRET_BYTES = 32;

const meaningfulUtf8ByteLength = (value: string) =>
  Buffer.byteLength(value.replace(/\s/gu, ""), "utf8");

export const privacyHmacSecret = () => {
  const secret = process.env.PRIVACY_HMAC_SECRET?.trim() ?? "";
  return meaningfulUtf8ByteLength(secret) >= MINIMUM_PRIVACY_SECRET_BYTES
    ? secret
    : "";
};
