# Third-party assets

## `public/audio/hayun-jumpscare.mp3`

- Title: **Female Scream Horror**
- Performer/uploader credit shown by the source: **NeoPhyTe**
- Source page: https://soundbible.com/1627-Female-Scream-Horror.html
- Direct MP3: https://soundbible.com/grab.php?id=1627&type=mp3
- License stated on the source page: **Public Domain**
- Downloaded: 2026-08-17
- Duration: 2.821188 seconds
- SHA-256: `afd5a2650a1b977957bb094e876a2afdae34f31bf692afd874e04b1e355e5539`
- Modification: none; the downloaded MP3 is stored byte-for-byte.

The source page and this provenance record should be rechecked before any future relicensing or commercial redistribution of the standalone asset.

## `public/audio/station-ambient.ogg`

- Title: **Ambient Horror Track 01**
- Creator: **Cleyton Kauffman**
- Source page: https://opengameart.org/content/ambient-horror-track-01
- Direct source archive: https://opengameart.org/sites/default/files/ambient_horror_track01.zip
- License stated on the source page and bundled `readme.txt`: **Creative Commons Zero (CC0)**
- Downloaded: 2026-08-17
- Original archive SHA-256: `b08345334b3178e6d340328787f7edefef8fde6545c86e8487a18d567e31671f`
- Game asset duration: 48.000000 seconds; stereo Vorbis OGG
- Game asset SHA-256: `021b7e116b6f91259db3465a0b11e4365546017ff1548f3fcbb12e35e526047d`
- Modification: the original seamless OGG was loudness-normalized to -22 LUFS and re-encoded with FFmpeg `libvorbis -q:a 3`; no composition edits were made.

## Kenney Interface Sounds derivatives

- Pack: **Interface Sounds (1.0)**
- Creator/distributor: **Kenney**
- Official source page: https://kenney.nl/assets/interface-sounds
- Direct source archive: https://kenney.nl/media/pages/assets/interface-sounds/0475c81886-1748704527/kenney_interface-sounds.zip
- License stated on the official page and bundled `License.txt`: **Creative Commons Zero (CC0)**
- CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/
- Downloaded: 2026-08-17
- Original archive SHA-256: `f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232`
- Modification: only the five listed source sounds were extracted, loudness-normalized with FFmpeg, and re-encoded to Vorbis OGG. The game applies an additional low per-cue gain so repeated interactions remain restrained.

| Game asset | Original file | Purpose | Duration | SHA-256 |
|---|---|---|---:|---|
| `sfx-navigate.ogg` | `Audio/switch_004.ogg` | previous/next scene movement | 0.500 s | `6484c4635c6dc42fa1770896952d0d84a892bfff9491e17b18173b50fe234c29` |
| `sfx-collect.ogg` | `Audio/drop_003.ogg` | physical item pickup | 0.191 s | `717b0e71bd64d297dfdc914726e97fbe05498b16b9116d17384dd343f5b9110c` |
| `sfx-error.ogg` | `Audio/error_001.ogg` | failed puzzle submission | 0.165 s | `feb6ac970cd61c489465e3fe6a72b313e7acb50c71137fb151aed63a5eb073c4` |
| `sfx-solve.ogg` | `Audio/scroll_002.ogg` | puzzle or mission completion | 1.000 s | `b3b0c02389d46e48e46ac1678903f10831d936230a9919e75a03c91d2b3ee404` |
| `sfx-choice.ogg` | `Audio/question_004.ogg` | consequential memory choice | 0.332 s | `07febbc5724e07e1f8ffa6907a5b0834fb9dd99bad49bc4a1787c18df29d462b` |
