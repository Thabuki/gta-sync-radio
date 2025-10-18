# GTA 3D Era Radio Player

Globally synchronized radio player inspired by GTA III, Vice City, and San Andreas. Everyone worldwide hears the same part of each station at the same time using Unix timestamp sync.

**Live Demo:** [https://thabuki.github.io/gta-sync-radio](https://thabuki.github.io/gta-sync-radio)

## Features

- Infinite carousel with game-themed UI (GTA III / Vice City / San Andreas)
- **Global sync** - same playback position for all listeners worldwide
- Looped audio files with automatic position calculation
- Station modals with tracklists
- Mobile-friendly with swipe support

## Known Issues

- **Sync drift**: There may be a drift of approximately 20 seconds between users due to network latency, buffer delays, and browser-specific playback timing. The Re-sync button can help minimize this drift.

## Usage

1. Open `index.html`
2. Browse stations with arrows, mouse wheel, or swipe
3. Click a station card to play
4. Use volume slider to adjust

## Tech

- Vanilla HTML/CSS/JS
- Native `<audio>` element
- Stations in `js/data/`
- Audio files in `media/<game>/`

## Credits

This is a fan-made project inspired by Rockstar Games' GTA series for non-commercial, educational use.

**Disclaimer:** All rights to the Grand Theft Auto series, game assets, radio station names, and content are owned by Rockstar Games and Take-Two Interactive. All music rights belong to their respective artists, composers, and copyright holders. This project is not affiliated with, endorsed by, or connected to Rockstar Games or Take-Two Interactive. No copyright infringement is intended.
