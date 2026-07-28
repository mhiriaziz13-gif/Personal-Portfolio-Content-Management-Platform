import "server-only";

import { inflateRawSync } from "node:zlib";

export const uploadBuckets = [
  "public-assets",
  "project-images",
  "resumes",
  "uploads",
] as const;

export type SecureUploadBucket = (typeof uploadBuckets)[number];

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const documentMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const extensionsByMime: Record<string, Set<string>> = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "application/pdf": new Set(["pdf"]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    new Set(["docx"]),
};

const allowedMimesForBucket = (bucket: SecureUploadBucket) => {
  if (bucket === "public-assets" || bucket === "project-images") {
    return imageMimeTypes;
  }
  if (bucket === "resumes") return documentMimeTypes;
  return new Set([...imageMimeTypes, ...documentMimeTypes]);
};

export const extensionForUpload = (name: string) =>
  name.split(".").pop()?.toLowerCase() ?? "";

const hasExpectedMagicBytes = (buffer: Buffer, mime: string) => {
  if (mime === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mime === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
      && buffer.subarray(Math.max(0, buffer.length - 1_024)).includes(Buffer.from("%%EOF"));
  }
  return true;
};

type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
  encrypted: boolean;
};

const findEndOfCentralDirectory = (buffer: Buffer) => {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
};

const isUnsafeArchivePath = (name: string) => {
  if (
    !name
    || name.length > 512
    || name.includes("\0")
    || name.includes("\\")
    || name.startsWith("/")
    || /^[a-z]:/i.test(name)
  ) {
    return true;
  }

  return name.split("/").some((segment) => segment === "..");
};

const parseCentralDirectory = (buffer: Buffer): ZipEntry[] | null => {
  if (buffer.length < 22) return null;
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0 || endOffset + 22 > buffer.length) return null;

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (
    entryCount < 1
    || entryCount > 2_000
    || centralSize > buffer.length
    || centralOffset + centralSize > endOffset
  ) {
    return null;
  }

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      return null;
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > buffer.length) return null;

    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (
      isUnsafeArchivePath(name)
      || ![0, 8].includes(compressionMethod)
      || (flags & 0x1) !== 0
    ) {
      return null;
    }

    totalUncompressed += uncompressedSize;
    if (
      totalUncompressed > 50 * 1024 * 1024
      || uncompressedSize > 10 * 1024 * 1024
      || (compressedSize > 0 && uncompressedSize / compressedSize > 100)
    ) {
      return null;
    }

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
      encrypted: (flags & 0x1) !== 0,
    });
    cursor = next;
  }

  return cursor === centralOffset + centralSize ? entries : null;
};

const extractZipEntry = (buffer: Buffer, entry: ZipEntry) => {
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    return null;
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataStart > buffer.length || dataEnd > buffer.length) return null;

  const compressed = buffer.subarray(dataStart, dataEnd);
  try {
    if (entry.compressionMethod === 0) return Buffer.from(compressed);
    return inflateRawSync(compressed, {
      maxOutputLength: Math.min(entry.uncompressedSize + 1, 2 * 1024 * 1024),
    });
  } catch {
    return null;
  }
};

export const validateDocx = (buffer: Buffer) => {
  const entries = parseCentralDirectory(buffer);
  if (!entries) return false;

  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const required = ["[Content_Types].xml", "_rels/.rels", "word/document.xml"];
  if (required.some((name) => !byName.has(name))) return false;
  if (
    entries.some((entry) => {
      const lower = entry.name.toLowerCase();
      return lower.includes("vbaproject.bin")
        || lower.startsWith("word/embeddings/")
        || /\.(exe|dll|js|vbs|ps1|bat|cmd|scr)$/i.test(lower);
    })
  ) {
    return false;
  }

  const contentTypes = extractZipEntry(buffer, byName.get("[Content_Types].xml")!);
  const relationships = extractZipEntry(buffer, byName.get("_rels/.rels")!);
  const document = extractZipEntry(buffer, byName.get("word/document.xml")!);
  if (!contentTypes || !relationships || !document) return false;

  return contentTypes.toString("utf8").includes(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  )
    && relationships.toString("utf8").includes(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
    )
    && /<w:document(?:\s|>)/.test(document.toString("utf8"));
};

export type UploadValidationInput = {
  bucket: SecureUploadBucket;
  name: string;
  mime: string;
  size: number;
  buffer: Buffer;
};

export const validateUpload = ({
  bucket,
  name,
  mime,
  size,
  buffer,
}: UploadValidationInput) => {
  const extension = extensionForUpload(name);
  const maxBytes = 10 * 1024 * 1024;

  if (
    size <= 0
    || size > maxBytes
    || size !== buffer.length
    || !allowedMimesForBucket(bucket).has(mime)
    || !extensionsByMime[mime]?.has(extension)
    || !hasExpectedMagicBytes(buffer, mime)
  ) {
    return { ok: false as const, code: "file_not_allowed" };
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    && !validateDocx(buffer)
  ) {
    return { ok: false as const, code: "invalid_docx" };
  }

  return { ok: true as const, extension };
};
