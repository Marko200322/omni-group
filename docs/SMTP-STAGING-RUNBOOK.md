# SMTP na staging-u (Atina Node)

**Kratak cilj:** na staging okruženju uključiti SMTP za **`atina-platform/atina`**, bez čuvanja tajni u gitu, i potvrditi **jedan odlazni** e-mail kroz **notifications** put (Nodemailer u `NotificationsModule`).

**Povezana dokumentacija (površina i kod):** [Email surface — Atina Node](../atina-platform/atina/docs/operations/EMAIL-SURFACE.md) — konfiguracija, uslovi slanja, imena env ključeva.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Tajne i repozitorijum

- Vrednosti za autentifikaciju i lozinke SMTP čuvaj u **secret manageru** / injekciji env-a na staging platformi (npr. Kubernetes secrets, GitHub Actions secrets, cloud secret store), u skladu sa politikom iz `atina-platform/atina/.env.example` (tajne ne commitovati).
- U repou ostaju samo **imena** promenljivih i prazan ili primer placeholder u `.env.example`; **ne** commitovati lokalni `.env` sa pravim kredencijalima.

---

## Checklist — imena promenljivih (iz `atina-platform/atina/.env.example`)

Popuni vrednosti u staging konfiguraciji / secret store-u; ovde su samo **ključevi** koje treba uskladiti:

| Promenljiva | Napomena (bez vrednosti) |
|-------------|-------------------------|
| `SMTP_ENABLED` | Mora biti uključeno za stvarno slanje (`true`). |
| `SMTP_HOST` | Host odlaznog provajdera. |
| `SMTP_PORT` | Port (npr. 587). |
| `SMTP_SECURE` | TLS/SSL flag u skladu sa provajderom. |
| `SMTP_USER` | Korisničko ime / adresa za SMTP auth — **iz secret store-a**. |
| `SMTP_PASSWORD` | Lozinka ili app password — **iz secret store-a**. |
| `EMAIL_FROM` | Adresa u `From` (mora biti dozvoljena kod provajdera). |
| `EMAIL_FROM_NAME` | Prikazno ime pošiljaoca. |

**Ponašanje aplikacije:** ako je `SMTP_ENABLED` postavljeno, ali `SMTP_USER` izgleda kao placeholder ili je prazan, servis **ne** verifikuje konekciju i **ne** šalje poštu (vidi `isSmtpConfigured()` u modulu notifikacija — detalj u [EMAIL-SURFACE.md](../atina-platform/atina/docs/operations/EMAIL-SURFACE.md)).

---

## Verifikacija: jedan odlazni e-mail (notifications put)

**Brza HTTP provera (nije dokaz mejla):** da li staging API odgovara (zameni `<BASE_URL>`):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "<BASE_URL>/health"
```

Očekivanje: **200**.

**Unit smoke (`createNotification` + `channel: 'email'`, mock Nodemailer — bez mreže):** iz `atina-platform/atina`:

```bash
npm test -- src/tests/unit/notifications.module.test.ts -t "createNotification email channel sends mail"
```

1. **Priprema naloga** — U staging bazi osiguraj korisnika čiji `users.email` pokazuje na **sandbox** inbox koji kontrolišeš (poruka će ići na tu adresu kada se pozove put ispod).
2. **Deploy / restart** — Primeni gornje env vrednosti na staging Atina Node proces i podigni servis.
3. **Log pri startu** — U logovima traži uspešnu SMTP proveru (`SMTP connection verified`). Ako konfiguracija nedostaje ili je nevalidna, videćeš upozorenja tipa da SMTP nije dostupan ili da e-mail nije poslat (bez leak-a tajni u log).
4. **Pokretanje istog koda kao u produkciji** — Jedini implementirani SMTP tok u aplikaciji je `NotificationsModule.createNotification(...)` sa **`channel: 'email'`** (lookup `users.email`, zatim `sendEmail`). U trenutnom izvoru **nema** javnog REST `POST` za kreiranje te notifikacije; za staging smoke koristi **staging-only** način poziva tog metoda (npr. privremeni interni skript / REPL / integracioni job u okruženju), uz validan JWT/session ako ga okruženje zahteva — bitno je da se **ne** loguju tajne.
5. **Potvrda isporuke** — Proveri sandbox inbox ili „sent“ evidenciju kod provajdera; u logu aplikacije treba da postoji zapis uspešnog slanja (nivo `info`, bez tela tajni).

Referenca ponašanja u testovima (mock transport): `atina-platform/atina/src/tests/unit/notifications.module.test.ts` (slučajevi sa `channel: 'email'`).

---

## Šta ovaj runbook ne pokriva

- Kontakt forma na `apps/omnigroup-web` (druga površina; vidi backlog u [FAZA-4-F4-6-NEXT.md](./FAZA-4-F4-6-NEXT.md)).
- Automation korak `send_email` (trenutno stub bez mrežnog slanja — vidi [EMAIL-SURFACE.md](../atina-platform/atina/docs/operations/EMAIL-SURFACE.md)).
