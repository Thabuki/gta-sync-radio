# GTA 3D Era Radio Player

A web-based, in-sync radio player inspired by GTA III, Vice City, and San Andreas. Pick a station, and the app syncs playback to the current real-world time so everyone hears the same part of the station at the same time.

## Features

- Infinite carousel of radio stations with smooth centering
- Game-themed UI that updates as you browse (GTA III / Vice City / San Andreas)
- One-click play with a brief radio static handoff for flavor
- **Global synchronized playback using UTC time** - everyone worldwide hears the same part of each station simultaneously
- Modal with station details and a static tracklist
- "Now Playing" toast that shows the station name
- Themed custom scrollbars (global + tracklist)
- Mobile-friendly with swipe support

## How it works

- Each station is a single looped audio file (music + ads). The app maps the current Unix timestamp (seconds since Jan 1, 1970 UTC) onto the audio's own duration to pick the correct position in the loop.
- When you center a station card, a short static sound plays, then the station starts at the correct offset.
- **Sync is timezone-agnostic**: uses Unix epoch time so listeners in New York, London, and Tokyo all hear the same track at the same moment.
- The UI theme changes per game (colors, logo) and persists your last station.

## Usage

1. Open `index.html` in a modern browser.
2. Use the carousel arrows, mouse wheel, or swipe to select a station.
3. Click a station card to open its modal and start playback.
4. Adjust volume with the slider on the main page.

Notes:

- The tracklist in the modal is non-interactive (static reference only).
- The Now Playing toast shows the current station name, not the track.

## Tech

- Vanilla HTML/CSS/JS (no frameworks)
- Web Audio via the native `<audio>` element

## Development

- Edit stations under `js/data/` to add or update stations (logo, audioFile, tracks).
- Audio is lazy-loaded and expected under `media/<game>/...`.
- Images should use modern formats when possible (WebP/SVG), with fallbacks.

## Credits & Licensing

- Game names and station concepts are inspired by Rockstar Games' GTA series. This is a fan-made, non-commercial project.
- Code is provided as-is for personal/educational use. Add a license if you intend broader distribution.

---

## GTA 3D Era Radio Player (pt-BR)

Um player de rádio na web, sincronizado, inspirado em GTA III, Vice City e San Andreas. Escolha uma estação e o app sincroniza a reprodução com o horário real atual, para que todos ouçam a mesma parte da estação ao mesmo tempo.

## Recursos

- Carrossel infinito de estações com centralização suave
- UI com tema do jogo que muda conforme você navega (GTA III / Vice City / San Andreas)
- Reprodução com um toque e transição com ruído estático de rádio
- **Reprodução sincronizada globalmente usando horário UTC** - todos no mundo ouvem a mesma parte de cada estação simultaneamente
- Modal com detalhes da estação e lista de faixas estática
- Toast de "Now Playing" exibindo o nome da estação
- Barras de rolagem personalizadas por tema (global + lista de faixas)
- Suporte a dispositivos móveis com gestos de deslizar

## Como funciona

- Cada estação é um único arquivo de áudio em loop (músicas + anúncios). O app mapeia o timestamp Unix atual (segundos desde 1 de janeiro de 1970 UTC) na própria duração do áudio para escolher a posição correta no loop.
- Ao centralizar um cartão de estação, um breve som de estática toca e, em seguida, a estação inicia no ponto correto.
- **Sincronia independente de fuso horário**: usa o tempo Unix epoch para que ouvintes em Nova York, Londres e Tóquio ouçam a mesma faixa no mesmo momento.
- O tema visual muda conforme o jogo (cores, logotipo) e a última estação é lembrada.

## Uso

1. Abra o arquivo `index.html` em um navegador moderno.
2. Use as setas do carrossel, a roda do mouse ou deslize para selecionar uma estação.
3. Clique no cartão da estação para abrir o modal e iniciar a reprodução.
4. Ajuste o volume com o controle deslizante na página principal.

Notas:

- A lista de faixas no modal é não interativa (apenas referência estática).
- O toast de Now Playing mostra apenas o nome da estação, não a faixa.

## Tecnologias

- HTML/CSS/JS puro (sem frameworks)
- Áudio via elemento nativo `<audio>`

## Desenvolvimento

- Edite as estações em `js/data/` para adicionar ou atualizar (logo, audioFile, faixas).
- O áudio é carregado sob demanda e esperado em `media/<game>/...`.
- Use formatos de imagem modernos quando possível (WebP/SVG), com fallbacks.

## Créditos e Licença

- Nomes e conceitos das estações são inspirados na série GTA da Rockstar Games. Este é um projeto de fãs, sem fins comerciais.
- O código é fornecido como está, para uso pessoal/educacional. Adicione uma licença se pretende distribuição mais ampla.
