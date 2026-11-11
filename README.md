# PinsLink

Chrome extension that collects Pinterest image links while you scroll, then exports them or downloads the images in the quality you choose.

## Install

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked and select the `pinlinks` folder

## Usage

1. Open Pinterest and scroll. Images are collected automatically.
2. Open the extension popup.
3. Pick a quality.
4. Click Download images, Export links, or Copy links.

Downloaded images are saved to `Downloads/PinsLink/`.

## Quality

| Option    | Notes                              |
|-----------|------------------------------------|
| originals | Full size, not on every pin        |
| 1200x     | Very high, not on every pin        |
| 736x      | Default, works on almost every pin |
| 564x      | Smaller files                      |
| 474x      | Smaller files                      |
| 236x      | Thumbnail                          |
| 170x      | Smallest thumbnail                 |

If the chosen size is missing for a pin, Download images falls back to the next smaller size.

## Buttons

- Pause / Resume: stop or restart collecting
- Clear: remove all collected pins

## Files

- `manifest.json`: extension config
- `content.js`: collects images on Pinterest pages
- `background.js`: handles downloads
- `popup.html`, `popup.js`: popup interface

Created by Manji.
