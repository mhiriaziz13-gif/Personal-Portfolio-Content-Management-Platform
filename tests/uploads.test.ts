import { describe, expect, it } from "vitest";

import {
  validateDocx,
  validateUpload,
} from "@/lib/security/uploads";

type ArchiveFile = { name: string; content: string };

const storedZip = (files: ArchiveFile[]) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const content = Buffer.from(file.content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + content.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
};

const validDocx = () => storedZip([
  {
    name: "[Content_Types].xml",
    content:
      '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  },
  {
    name: "_rels/.rels",
    content:
      '<Relationships><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/></Relationships>',
  },
  {
    name: "word/document.xml",
    content: '<w:document xmlns:w="urn:test"><w:body/></w:document>',
  },
]);

describe("secure upload validation", () => {
  it("accepts a structurally valid minimal DOCX package", () => {
    const buffer = validDocx();
    expect(validateDocx(buffer)).toBe(true);
    expect(validateUpload({
      bucket: "resumes",
      name: "resume.docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buffer.length,
      buffer,
    })).toEqual({ ok: true, extension: "docx" });
  });

  it("rejects a fake ZIP renamed as DOCX", () => {
    expect(validateDocx(Buffer.from("PK not a real archive"))).toBe(false);
  });

  it("rejects traversal paths and embedded executables", () => {
    const traversal = storedZip([
      { name: "../[Content_Types].xml", content: "x" },
      { name: "_rels/.rels", content: "x" },
      { name: "word/document.xml", content: "x" },
    ]);
    expect(validateDocx(traversal)).toBe(false);

    const embedded = storedZip([
      ...[
        {
          name: "[Content_Types].xml",
          content:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
        },
        {
          name: "_rels/.rels",
          content:
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
        },
        { name: "word/document.xml", content: "<w:document>" },
      ],
      { name: "word/embeddings/payload.exe", content: "MZ" },
    ]);
    expect(validateDocx(embedded)).toBe(false);
  });

  it("enforces bucket-specific media types", () => {
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.7\n"),
      Buffer.alloc(20),
      Buffer.from("\n%%EOF"),
    ]);
    expect(validateUpload({
      bucket: "project-images",
      name: "report.pdf",
      mime: "application/pdf",
      size: pdf.length,
      buffer: pdf,
    })).toMatchObject({ ok: false, code: "file_not_allowed" });
  });
});
