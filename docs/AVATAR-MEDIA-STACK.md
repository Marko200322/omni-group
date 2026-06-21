# Avatar media stack — skalabilni provajderi

Platforma bira **prvi konfigurisani** provajder iz lanca u `.env`. Kako dodaješ API ključeve, kvalitet avatara raste bez refaktora koda.

## Trenutni stack (u kodu)

| Sloj | Provajderi (redosled) | Env |
|------|------------------------|-----|
| **Mozak** | OpenRouter / custom AI gateway | `AI_URL`, `AI_KEY` |
| **Glas** | ElevenLabs → Cartesia | `AVATAR_TTS_PROVIDER_CHAIN`, `ELEVENLABS_*`, `CARTESIA_*` |
| **Video** | HeyGen → D-ID → Live Portrait | `AVATAR_VIDEO_PROVIDER_CHAIN`, `HEYGEN_API_KEY`, `DID_API_KEY`, `APEX_LIVE_PORTRAIT_*` |
| **Memorija** | PostgreSQL logs + AI aggregator (Pinecone/Qdrant na gateway-u) | `AVATAR_CLIENT_MEMORY_ENABLED` |

## Preporuka iz mejla (faze)

**Faza 1 (sada):** ElevenLabs + HeyGen ili D-ID + postojeći PostgreSQL/Redis  
**Faza 2:** Cartesia (brži TTS), Tavus (personalizovani video)  
**Faza 3:** Pinecone/Qdrant preko AI agregatora za dugoročnu memoriju klijenta  
**Faza 4:** n8n/Temporal za hiljade agenata po nišama  

## Dodavanje novog provajdera

1. Novi fajl u `providers/` (npr. `tavus-video.provider.ts`)
2. Registruj ID u `avatar-video-render.provider.ts` lancu
3. Dodaj env u `config/index.ts` i `.env.example`
4. Bez promene UI-a — avatar panel automatski prikazuje video URL

## API

`GET /video-meetings/avatar/media-stack` — koji TTS/video provajderi su aktivni.

## Setup

```powershell
cd atina-platform\atina
copy config\avatar-premium.local.json.example config\avatar-premium.local.json
# popuni heygenApiKey ili didApiKey
.\scripts\apply-avatar-premium-env.ps1
```

Prioritet za ultra-realizam: **HeyGen** (najbolji talking photo) ili **D-ID** (brži start sa slikom URL-a).
