import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmacSha256Hex = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("hex");

export const constantTimeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
};

export const hashNullable = (value: string | null | undefined) =>
  value ? sha256Hex(value) : null;
