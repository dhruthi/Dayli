import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { stickerFor, stickerBaseUrl, STICKERS } from '../lib/stickers.js';

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('Sticker registry', () => {
  it('builds an https link from the configured base url', () => {
    process.env.PUBLIC_BASE_URL = 'https://dayli.example.com/';
    expect(stickerFor('bloom')).toEqual({
      link: 'https://dayli.example.com/stickers/bloom.webp',
    });
  });

  it('falls back to the Render-provided url', () => {
    delete process.env.PUBLIC_BASE_URL;
    process.env.RENDER_EXTERNAL_URL = 'https://dayli.onrender.com';
    expect(stickerBaseUrl()).toBe('https://dayli.onrender.com');
    expect(stickerFor('care').link).toContain('/stickers/care.webp');
  });

  it('returns null rather than a broken link when no url is configured', () => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.RENDER_EXTERNAL_URL;
    expect(stickerFor('bloom')).toBeNull();
  });

  it('refuses a non-https base url, which Meta cannot fetch', () => {
    process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
    expect(stickerFor('bloom')).toBeNull();
  });

  it('returns null for an unknown sticker name', () => {
    process.env.PUBLIC_BASE_URL = 'https://dayli.example.com';
    expect(stickerFor('nope')).toBeNull();
  });
});

describe('Built sticker files meet Meta requirements', () => {
  const built = Object.values(STICKERS).map((f) => `${import.meta.dirname}/../public/stickers/${f}`);

  it('has a built file for every registered sticker', () => {
    for (const f of built) expect(existsSync(f), `missing ${f}`).toBe(true);
  });

  it('is WebP, 512x512, under the 100KB static limit, with alpha', () => {
    for (const f of built) {
      const buf = readFileSync(f);
      // RIFF....WEBP header
      expect(buf.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(buf.subarray(8, 12).toString('latin1')).toBe('WEBP');

      // VP8X extended header carries canvas size and the alpha flag.
      expect(buf.subarray(12, 16).toString('latin1')).toBe('VP8X');
      const hasAlpha = Boolean(buf[20] & 0x10);
      expect(hasAlpha, `${f} has no alpha channel`).toBe(true);
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      expect([width, height]).toEqual([512, 512]);

      expect(statSync(f).size).toBeLessThanOrEqual(100 * 1024);
    }
  });
});
