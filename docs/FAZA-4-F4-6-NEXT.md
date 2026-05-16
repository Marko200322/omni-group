# F4-6 — sledeći sprint (AI / email / upload)

Cilj: pripremiti **mali, izvodljiv** obim za tim od 2 — bez gradnje celog proizvoda. Izvor istine za backend ostaje **`atina-platform/atina`**; marketing/dashboard ostaje **`apps/omnigroup-web`**.

**Next — interni dok hub:** uz `npm run dev` u `apps/omnigroup-web`, ruta **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## (a) Mapa „gde danas“

### Atina — notifikacije i email

- **Modul:** `atina-platform/atina/src/modules/notifications/notifications.module.ts`
  - REST pod prefiksom **`/api/v1/notifications`** (slug modula = `notifications`).
  - **In-app:** lista, označi kao pročitano, read-all, brisanje, `GET .../unread-count` (za autentifikovanog korisnika).
  - **Email:** Nodemailer transporter iz `config.smtp`; slanje pri `createNotification` kada je `channel === 'email'` (lookup email korisnika iz `users`).
  - **Konfiguracija:** `SMTP_*`, `EMAIL_FROM`, `EMAIL_FROM_NAME` u `atina-platform/atina/src/config/index.ts`; operativna matrica u `atina-platform/atina/docs/operations/production-config-matrix.md` (bez vrednosti tajni u repou).

### Atina — „AI“ u širem smislu

- **`ai-memory`:** `atina-platform/atina/src/modules/ai-memory/ai-memory.module.ts` — **`/api/v1/ai-memory`**: `POST /remember`, `GET /recall`; perzistencija kroz tabelu `logs` (kategorija `ai-memory`), **nije** spoljni LLM provajder.
- **`recommendation`:** `atina-platform/atina/src/modules/recommendation/recommendation.module.ts` — **`/api/v1/recommendation/next-actions`**: heuristike nad DB (pretplate, taskovi, plaćanja), bez poziva ka OpenAI/Anthropic u kodu modula.
- **Registracija modula:** `atina-platform/atina/src/core/CoreEngine.ts` (`AiMemoryModule`, `RecommendationModule`, `NotificationsModule`, …).

### Next — `apps/omnigroup-web`

- **Kontakt (nije file upload):** `src/app/contact/page.tsx` šalje JSON na **`/api/contact`**.
- **API ruta (stub):** `src/app/api/contact/route.ts` — vraća `{ ok: true, message: 'queued_local_stub' }`; komentar u kodu: proširiti Resend/SMTP kasnije.
- **Površina za upload fajlova:** u trenutnom kodu **nema** `input type="file"` / multipart upload flow-a za end-user; jedini `FormData` je za polja kontakt forme.

---

## (b) 3–5 mali predlozi isporuke (MVP) + acceptance (jedna rečenica)

1. **Runbook: SMTP na staging-u** — [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) · kontekst e-pošte u Atini: [`EMAIL-SURFACE.md`](../atina-platform/atina/docs/operations/EMAIL-SURFACE.md): šta postaviti u secret store-u, `SMTP_ENABLED`, smoke korak (npr. jedan test mail). **Acceptance:** član tima može da prati dokument i pošalje jedan test mejl u staging okruženju bez dodavanja tajni u git.
2. **Kontakt forma → stvarna isporuka (env-only)** — Implementirati slanje iz `apps/omnigroup-web` (npr. Resend ili SMTP preko server-only env varijabli) ili proksi ka Atina ako se uskladi API; **ne** commitovati ključeve. **Acceptance:** POST sa validnim telom u ciljnom okruženju rezultira stvarnim emailom na test inbox ili provider „sent“ logu, a repozitorijum ostaje bez sekreta.
3. **Dashboard: broj nepročitanih notifikacija** — U autentifikovanom delu `omnigroup-web`, jedan `fetch` ka `GET /api/v1/notifications/unread-count` (isti pattern kao postojeći pozivi ka Atini). Dizajn opcija za autentifikaciju: [`DASHBOARD-AUTH-ROADMAP.md`](./DASHBOARD-AUTH-ROADMAP.md). **Acceptance:** prijavljen korisnik vidi broj koji se poklapa sa stanjem u bazi nakon kreiranja/čitanja notifikacije.
4. **AI „vertical slice“ preko `ai-memory`** — Mini UI ili dev-only stranica: `POST /remember` pa `GET /recall` za ulogovanog korisnika. **Acceptance:** uneti par ključeva i vratiti ih kroz `recall` u istoj sesiji bez 500 greške.
5. **Upload spike (dokument + tanak prototip)** — Dizajn jednog flow-a (npr. mali fajl → privremeni storage ili presigned URL), eksplicitno van repoa za bucket kredencijale; detalji u [`F4-6-UPLOAD-SPIKE.md`](./F4-6-UPLOAD-SPIKE.md). **Acceptance:** MD sa odlukom (storage vs. direktno u PG), limit veličine/tipa fajla, i opciono jedna Next ruta koja u dev-u prihvata multipart ali ne zahteva prave cloud kredencijale u gitu.

---

## (c) Bez tajni u repou

- API ključevi (OpenAI, Resend, SendGrid, SMTP lozinke, S3 pristup), JWT/Stripe i ostali sekreti idu isključivo u **okruženje / secret manager**; u kodu i PR-ovima samo imena varijabli i `.env.example` bez pravih vrednosti.
- Docker compose i dev defaulti u repou služe lokalnom razvoju — **ne smatraju se** produkcijskim tajnama; i dalje ne commitovati lokalni `.env` sa pravim ključevima.

---

**Povezano:** red **F4-6** u [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md).
