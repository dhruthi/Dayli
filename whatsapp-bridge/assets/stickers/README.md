# Stickers

Source artwork for dayli's WhatsApp stickers. Everything here is built with
free, local tooling — no Canva account and no uploading artwork to a third
party.

## Making a new sticker

1. Draw it as a 512×512 SVG in this folder. Use the existing files as a
   starting point — same palette, same cream `#FFF6EC` outline (it is what
   keeps the shape readable on WhatsApp's dark theme).
2. Run `./scripts/build-stickers.sh` from `whatsapp-bridge/`.
3. Register it in `lib/stickers.js` under a semantic name.
4. `npm test` — the suite checks the built file is really 512×512 WebP with
   alpha and under 100 KB.

## Design constraints

- **No text.** The bot replies in English, Telugu and Hindi. A sticker with
  baked-in English words is wrong for most users.
- **Transparent background.** Stickers sit directly on the chat wallpaper;
  a matte shows up as an ugly box.
- **Readable at ~120 px.** That is roughly how big a sticker renders in a
  chat. Thin lines and fine detail disappear — test with the montage command
  below before committing.
- **Nothing clinical.** See the note in `lib/stickers.js`: stickers are for
  warm, non-medical moments only. Never next to symptom or emergency advice.

Preview how a build reads on both themes:

```sh
cd public/stickers
magick \( bloom.webp -resize 200x200 +repage \) \( hydrate.webp -resize 200x200 +repage \) \
       \( suncare.webp -resize 200x200 +repage \) \( care.webp -resize 200x200 +repage \) \
       +append +repage -background '#0b141a' -alpha remove /tmp/preview.png && open /tmp/preview.png
```

## Meta's requirements

| | Static | Animated |
|---|---|---|
| Format | WebP | WebP |
| Canvas | 512×512 | 512×512 |
| Max size | 100 KB | 500 KB |

## Why links, not media IDs

Media IDs from `POST /{phone-number-id}/media` expire after **30 days**, so an
ID pasted into config silently breaks a month after deploy. These files are
served by this process at `/stickers/*.webp` and sent as links, which have no
expiry. `cloudApi.uploadMedia()` exists if you ever need the ID route for
one-off or user-supplied media.

Meta fetches the link server-to-server, so it must be a public HTTPS origin —
`PUBLIC_BASE_URL`, or `RENDER_EXTERNAL_URL` which Render sets for you. With
neither set (local dev), `stickerFor()` returns `null` and the sticker is
skipped rather than sending a broken link.
