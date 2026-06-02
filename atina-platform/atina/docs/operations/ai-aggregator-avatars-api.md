# AI agregator — avatar API (ATINA poziva, agregator radi posao)

Kad su `AI_URL` + `AI_KEY` postavljeni i `AVATAR_USE_AI_AGGREGATOR=true`, modul `video-meetings` delegira:

| Endpoint | Svrha |
|----------|--------|
| `POST /v1/avatars/roster/generate` | Sistem generiše tim (imena, personae, portreti, glasovi) |
| `POST /v1/avatars/conversation/turn` | Jedan turn: razumevanje + odgovor + TTS + lip-sync video |
| `POST /v1/avatars/speech/render` | Samo govor + animacija za dati tekst |

## 1. Generisanje tima

**Request**
```json
{
  "team": "support",
  "count": 3,
  "locale": "sr-RS",
  "brand": "ATINA"
}
```

**Response**
```json
{
  "agents": [
    {
      "id": "mila",
      "name": "Mila",
      "title": "Tehnička podrška",
      "persona": "...",
      "greeting": "...",
      "avatarUrl": "https://cdn.../mila.png",
      "voiceId": "elevenlabs-voice-id"
    }
  ],
  "source": "generated"
}
```

## 2. Conversation turn (preferirano)

**Request**
```json
{
  "team": "sales",
  "agentId": "nikola",
  "sessionId": "uuid",
  "mode": "reply",
  "agent": {
    "name": "Nikola",
    "title": "Prodaja",
    "persona": "...",
    "avatarUrl": "https://...",
    "voiceId": "..."
  },
  "history": [{ "role": "user", "content": "Koliko košta Pro?" }],
  "userMessage": "Koliko košta Pro?"
}
```

**Response**
```json
{
  "text": "Pro plan je ...",
  "audioBase64": "...",
  "audioMimeType": "audio/mpeg",
  "videoUrl": "https://cdn.../clip.mp4",
  "avatarUrl": "https://cdn.../nikola.png"
}
```

## 3. Fallback u ATINA-i

Ako agregator nije dostupan, ATINA koristi:
- ugrađeni default tim (system roster),
- lokalni `chat/completions` + ElevenLabs + Live Portrait (ako su ključevi u `.env`).

Vlasnik u praksi popunjava samo **`AI_URL` + `AI_KEY`** — ostalo radi agregator.
