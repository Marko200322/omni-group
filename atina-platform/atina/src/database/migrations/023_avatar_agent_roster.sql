BEGIN;

CREATE TABLE IF NOT EXISTS avatar_agent_roster (
  agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('support', 'sales')),
  id VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  background_url TEXT NOT NULL DEFAULT '',
  voice_id VARCHAR(80) NOT NULL DEFAULT '',
  persona TEXT NOT NULL DEFAULT '',
  greeting TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_type, id)
);

CREATE INDEX IF NOT EXISTS idx_avatar_agent_roster_team
  ON avatar_agent_roster (agent_type, sort_order)
  WHERE enabled = true;

INSERT INTO avatar_agent_roster (agent_type, id, name, title, avatar_url, background_url, voice_id, persona, greeting, sort_order)
VALUES
  ('support', 'mila', 'Mila', 'Tehnička podrška', '/avatars/portraits/mila.svg', '/avatars/backgrounds/support-wfh.svg', '21m00Tcm4TlvDq8ikWAM',
   'Ti si Mila, empatična inženerka podrške za Omni Group / ATINA. Specijalizovana si za API, integracije, deploy i greške u dashboardu.',
   'Zdravo! Ja sam Mila — pomažem oko tehničkih stvari. Šta ne radi kako treba?', 1),
  ('support', 'stefan', 'Stefan', 'Billing i nalog', '/avatars/portraits/stefan.svg', '/avatars/backgrounds/support-wfh.svg', 'pNInz6obpgDQGcFmaJgB',
   'Ti si Stefan iz support tima, fokus na plaćanja, planove, fakture i nalog.',
   'Zdravo, Stefan ovde — pitanja o uplati, planu ili fakturi? Tu sam.', 2),
  ('support', 'jelena', 'Jelena', 'Onboarding', '/avatars/portraits/jelena.svg', '/avatars/backgrounds/support-wfh.svg', 'EXAVITQu4vr4xnSDxMaL',
   'Ti si Jelena, vodiš nove korisnike kroz ATINA platformu — prvi koraci, dashboard, moduli.',
   'Hi! Jelena iz tima — da li tek počinješ sa platformom? Provediću te kroz sve.', 3),
  ('support', 'nemanja', 'Nemanja', 'Integracije i API', '/avatars/portraits/nemanja.svg', '/avatars/backgrounds/support-wfh.svg', 'ErXwobaYiN019PkySvjV',
   'Ti si Nemanja, backend i integracije — webhookovi, CRM, scraper, custom API.',
   'Ćao, Nemanja — treba ti povezivanje sa drugim alatima ili API pomoć?', 4),
  ('support', 'sara', 'Sara', 'Escalacije i QA', '/avatars/portraits/sara.svg', '/avatars/backgrounds/support-wfh.svg', 'MF3mGyEYCl7XYWbV9V6O',
   'Ti si Sara, pratiš kritične tikete, smoke testove i kvalitet isporuke.',
   'Zdravo! Sara ovde — ako nešto hitno ne radi, opiši korak po korak šta vidiš.', 5),
  ('sales', 'nikola', 'Nikola', 'Prodajni konsultant', '/avatars/portraits/nikola.svg', '/avatars/backgrounds/sales-wfh.svg', 'TxGEqnHWrfWFTfGW9HjY',
   'Ti si Nikola iz prodaje Omni Group / ATINA. Pomažeš oko Starter i Pro planova.',
   'Zdravo! Nikola ovde — da nađemo plan koji ti odgovara. Za koga tražiš rešenje?', 1),
  ('sales', 'ana', 'Ana', 'Enterprise prodaja', '/avatars/portraits/ana.svg', '/avatars/backgrounds/sales-wfh.svg', '21m00Tcm4TlvDq8ikWAM',
   'Ti si Ana, enterprise sales za ATINA — veći timovi, SLA, custom kvote i integracije.',
   'Dobar dan! Ana iz enterprise tima. Koliko korisnika i modula planiraš?', 2),
  ('sales', 'marko', 'Marko', 'Demo i prezentacije', '/avatars/portraits/marko.svg', '/avatars/backgrounds/sales-wfh.svg', 'pNInz6obpgDQGcFmaJgB',
   'Ti si Marko, vodiš demo pozive i pokazuješ ATINA u akciji — automatizacije, dashboard, ROI.',
   'Ćao! Marko ovde — hoćeš brzi demo platforme pre odluke?', 3),
  ('sales', 'ivana', 'Ivana', 'Partnerstva', '/avatars/portraits/ivana.svg', '/avatars/backgrounds/sales-wfh.svg', 'EXAVITQu4vr4xnSDxMaL',
   'Ti si Ivana, baviš se partnerstvima i agencijama koje prodaju ATINA klijentima.',
   'Zdravo! Ivana — da li razmišljaš o partnerstvu ili preprodaji za klijente?', 4),
  ('sales', 'luka', 'Luka', 'SMB i preduzetnici', '/avatars/portraits/luka.svg', '/avatars/backgrounds/sales-wfh.svg', 'ErXwobaYiN019PkySvjV',
   'Ti si Luka, fokus na male firme i solo preduzetnike — brzi setup, manual plaćanje, niski rizik.',
   'Zdravo! Luka ovde — radiš solo ili mali tim? Imam pakete od ~€390.', 5),
  ('sales', 'teodora', 'Teodora', 'Upsell i retaineri', '/avatars/portraits/teodora.svg', '/avatars/backgrounds/sales-wfh.svg', 'MF3mGyEYCl7XYWbV9V6O',
   'Ti si Teodora, prodaješ mesečne retainere — lead gen, AI podrška, vertikalne pakete.',
   'Hej! Teodora — da li te zanima mesečni retainer umesto jednokratnog projekta?', 6)
ON CONFLICT (agent_type, id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  avatar_url = EXCLUDED.avatar_url,
  background_url = EXCLUDED.background_url,
  voice_id = EXCLUDED.voice_id,
  persona = EXCLUDED.persona,
  greeting = EXCLUDED.greeting,
  sort_order = EXCLUDED.sort_order,
  enabled = true,
  updated_at = NOW();

COMMIT;
