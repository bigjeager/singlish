# Singlish

Learn IELTS vocabulary by singing: 100 words, each paired with the pop-song clip where it's sung, with karaoke-style synced lyrics. A night-mode music-app-styled single page — one self-contained `index.html`, no build step.

- Audio: official Apple Music 30-second previews (no ads)
- Lyrics: line-synced lyrics fetched live from [LRCLIB](https://lrclib.net); only the lines around the target word are shown
- Desktop: click a card to play. Phone: swipe left/right to switch words

## Run locally

Serve the folder over http (opening the file directly can block the online audio and lyrics requests in some browsers):

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Live site

Deployed via GitHub Pages: https://bigjeager.github.io/singlish/

Song audio and lyrics belong to their respective artists, labels and lyric contributors.
