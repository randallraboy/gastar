#!/usr/bin/env tsx
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const baseUrl = process.env.GASTAR_URL?.replace(/\/$/, "");
const token = process.env.HARNESS_TOKEN;

if (!baseUrl || !token) {
  console.error("Set GASTAR_URL and HARNESS_TOKEN environment variables");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
};

async function listPending() {
  const res = await fetch(`${baseUrl}/api/receipts?status=pending`, { headers });
  if (!res.ok) {
    throw new Error(`list failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

async function pull(dir: string) {
  await mkdir(dir, { recursive: true });
  const res = await fetch(`${baseUrl}/api/receipts?status=pending`, { headers });
  if (!res.ok) {
    throw new Error(`list failed: ${res.status}`);
  }
  const receipts: Array<{ id: string; imageUrl: string; note?: string | null }> =
    await res.json();
  const manifest: Array<{ id: string; filename: string; note?: string }> = [];

  for (const receipt of receipts) {
    const imageRes = await fetch(`${baseUrl}${receipt.imageUrl}`, { headers });
    if (!imageRes.ok) {
      throw new Error(`download failed for ${receipt.id}`);
    }
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const filename = `${receipt.id}.${ext}`;
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    const entry: { id: string; filename: string; note?: string } = {
      id: receipt.id,
      filename,
    };
    if (receipt.note && receipt.note.trim()) {
      entry.note = receipt.note;
    }
    manifest.push(entry);
  }

  await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Downloaded ${manifest.length} receipt(s) to ${dir}`);
}

async function push(resultsPath: string) {
  const raw = await readFile(resultsPath, "utf-8");
  const results: Array<Record<string, unknown>> = JSON.parse(raw);

  for (const entry of results) {
    const id = entry.id as string;
    const body = { ...entry };
    delete body.id;
    const res = await fetch(`${baseUrl}/api/receipts/${id}/result`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`push failed for ${id}: ${res.status} ${await res.text()}`);
    } else {
      console.log(`pushed result for ${id}`);
    }
  }
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case "list":
      await listPending();
      break;
    case "pull":
      if (!arg) {
        console.error("Usage: harness pull <dir>");
        process.exit(1);
      }
      await pull(arg);
      break;
    case "push":
      if (!arg) {
        console.error("Usage: harness push <results.json>");
        process.exit(1);
      }
      await push(arg);
      break;
    default:
      console.error("Usage: harness <list|pull|push> [arg]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
