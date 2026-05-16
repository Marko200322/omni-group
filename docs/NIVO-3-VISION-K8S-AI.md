# Nivo 3 — vizionarski opseg (V.1 / V.2)



**Agent:** N3-B5 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

## Zadatak



1. Iz `TitanOmniGroup_ULTRA_Blueprint.pdf` / Ultimate blueprint sažetka (iz drugih wave dokumenata): izdvoji šta spada na **Kubernetes** (V.1) vs **prošireni AI** (V.2).

2. Za svaku stavku: **N/A u N3** (razlog) **ili** „ulazi u backlog proizvoda“ sa jednom rečenicom.



## V.1 Kubernetes — jedan pasus



V.1 obuhvata ciljnu platformsku sliku gde se **radna opterećenja, mreža, skladištenje i životni ciklus servisa** izvode na Kubernetes klasterima: multi-tenant izolacija (namespace, kvote, NetworkPolicy), ingress/service mesh, horizontalno i vertikalno skaliranje, GitOps ili deklarativni deploy (Helm/Kustomize), centralizovani metrički, log i trace slojevi, bezbednosne politike (PSA, admission, secrets), backup/DR šabloni i GPU/CPU scheduling gde je to infrastrukturni nosilac za aplikacije — u skladu sa Ultimate Node / ULTRA dokumentima koji spominju K8s kao nosilac za operativni deo sistema.



## V.2 Prošireni AI — jedan pasus



V.2 obuhvata **AI proizvodni sloj iznad čistog orkestracije**: orkestracija agenata i alata, RAG (ingest, indeks, eval), model lifecycle (serving verzija, A/B, guardrails), fine-tuning i eksperimentisanje, vektorske i znanstvene baze kao deo proizvoda, policy za LLM odgovore, billing/kvota po tokenu ili po zadatku, i integracije koje nisu same po sebi „klaster admin“ posao već **proširena AI funkcionalnost** koju ULTRA blueprint tipično stavlja uz SaaS jezgro i module.



## Odluka (tim potvrđuje; N3-B5 podrazumevano N/A do product sign-off-a)



| Stavka | V.1 K8s | V.2 AI | Preporuka |

|--------|---------|--------|------------|

| Multi-tenant klaster i izolacija radnih opterećenja | Namespaces, ResourceQuota/LimitRange, NetworkPolicy, PSA; cilj je predvidljiv SLA i bezbedan tenant boundary na istom klasteru. | Samo ako AI servisi eksplicitno zahtevaju tenant-aware routing ili per-tenant model rute kao proizvodnu funkciju — inače ostaje infra. | **N/A u N3** — bez product odluke o tenant modelu i SLA-u; ulazi u backlog ako product definiše multi-tenant AI ponudu. |

| Ingress, TLS i spoljni API endpointi | Ingress kontroleri, cert manager, rate limiting na edge-u, konzistentni host/path za backend timove. | Eksterni „AI API“ ugovor (verzije, deprecacija) može biti proizvod, ali hostovanje i TLS su V.1. | **N/A u N3** — osim ako product prioritizuje javni AI API; infra deo ostaje van N3 osim backlog potvrde. |

| Observabilnost (metrički, logovi, trace) | Prometheus-compatible scrape, agregacija logova, distributed tracing za sve workload-e; SLO alerting na klasteru. | AI-specifične metrike (latencija po modelu, token usage, eval skorovi) kao dashboardi iznad generičkog steka. | **N/A u N3** — generički stack N/A bez product scope-a; AI metrike **backlog** ako product traži vidljivost po modelu/agentu. |

| GitOps / CI-CD za K8s manifeste | Argo CD ili ekvivalent, promotion između okruženja, reproducibilni release-i. | Pipeline koraci za pakovanje modela/artefakata mogu biti povezani, ali srž je deploy discipline na K8s. | **N/A u N3** — standardni DevOps backlog osim ako N3 eksplicitno uključuje platform CI; podrazumevano N/A za N3 ciklus. |

| Ultimate Node / edge pakovanje i operator šabloni | Ako blueprint predviđa **operator** ili chart koji upravlja node lifecycle-om na K8s — to je V.1 nosilac. | Ako „Ultimate“ uključuje **AI module** na edge-u (lokalni inference), granica je hibrid: orkestracija V.1, model logika V.2. | **N/A u N3** — potrebna product odluka da li je edge AI u opsegu; do tada N/A sa referencom na PDF mapiranje iz Talas A. |

| Model serving i GPU scheduling | Deployment/StatefulSet/HPA za inference, device plugin, prioritet redova, autoscaling čvorova. | Izbor modela, verzionisanje, prompt pipeline, guardrails — proizvodni AI sloj. | **N/A u N3** — GPU klaster kao platforma je veliki scope; **backlog** samo ako product potvrdi inference kao N3 isporuku. |

| Agenti, alati (tools) i workflow orkestracija | Može koristiti K8s Job/CronJob za izvršavanje, ali **semantika agenata** nije K8s. | Definicija agenata, memorija, tool contracts, human-in-the-loop — srž V.2. | **N/A u N3** — tipično najveći V.2 deo; u backlog proizvoda kada product definiše MVP agenta. |

| RAG: ingest, indeks, retrieval kvalitet | Batch/Job workload na K8s za ETL može biti V.1 izvršavanje. | Šema dokumenata, chunking, embedding model, eval retrievala — V.2. | **N/A u N3** — RAG kao proizvod **backlog** uz product prioritet; K8s samo izvršava zadatke ako uopšte uđe u scope. |

| Fine-tuning, eval i eksperimentisanje | Trening jobovi kao K8s workload (GPU node pool). | Dataset governance, eval harness, promocija modela — V.2. | **N/A u N3** — visok rizik/scope; **N/A** za N3 osim eksplicitnog product „da“. |

| Bezbednost: secrets, policy admission, workload identitet | RBAC, ServiceAccount, external secrets, OPA/Kyverno, mTLS između servisa. | AI safety policy (sadržaj, PII) kao aplikacioni sloj iznad infra politika. | **N/A u N3** — osnovna infra bezbednost može biti paralelno van N3-B5; AI safety **backlog** po product brief-u. |

| Troškovna kontrola i kapacitet | Klaster autoscaler, quota po timu, FinOps metrike na čvorovima. | Kvota po korisniku/tenantu za AI potrošnju (token, request) kao proizvodno pravilo. | **N/A u N3** — FinOps **backlog** ako product traži billing-aware limite; klaster FinOps ostaje N/A za N3 bez potvrde. |



**Podrazumevano pravilo za N3 ciklus:** sve gore je **N/A u N3** dok product eksplicitno ne prebaci stavku u „ulazi u backlog“ ili u aktivni N3 opseg; N3-B5 ne pretpostavlja product prioritet.

## Sledeće kad product potvrdi

Uređen backlog (bez lažnih `[x]` — ništa se ne smatra urađenim dok product ne potvrdi opseg i tim ne počne isporuku): **[`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md)**. Red **#19** u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) ostaje `[ ]` do te odluke.

## See also (trenutni monorepo gate)

Bez obzira na V.1/V.2 backlog, **postojeći** repo već ima jedan integrisani workflow **CI (monorepo)** (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest`; Atina `test:ci`; **`apps/omnigroup-web`** build; Nest `verify:ci`; tri `docker compose config`; pet jobova na GitHubu) — lokalno ili na GitHubu: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

