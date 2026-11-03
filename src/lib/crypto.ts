import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters.");
  }
  return Buffer.from(value, "hex");
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSecret(value: string) {
  const [version, ivText, tagText, ciphertextText] = value.split(":");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new Error("Unsupported encrypted secret format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signOAuthState(payload: string) {
  const signature = createHmac("sha256", encryptionKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(createHmac("sha256", encryptionKey()).update(payload).digest("base64url"));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  const [nonce, timestampText] = payload.split(".");
  const timestamp = Number(timestampText);
  return Boolean(nonce) && Number.isFinite(timestamp) && Date.now() - timestamp < 10 * 60 * 1000 && timestamp <= Date.now() + 30_000;
}

export function randomOAuthState() {
  const payload = `${randomBytes(24).toString("base64url")}.${Date.now()}`;
  return signOAuthState(payload);
}

export function signPublicMediaUrl(assetId: string, expiresAt: number) {
  const payload = `${assetId}.${expiresAt}`;
  return createHmac("sha256", encryptionKey()).update(payload).digest("base64url");
}

export function verifyPublicMediaUrl(assetId: string, expiresAt: number, signature: string) {
  if (!Number.isFinite(expiresAt)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt < now || expiresAt > now + 60 * 60) return false;
  const expected = Buffer.from(signPublicMediaUrl(assetId, expiresAt));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
