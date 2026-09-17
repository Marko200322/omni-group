Omni Group — lokalni deploy secrets (NIKAD ne commit-uj ovaj folder)

KORACI:
1. Kopiraj deploy.config.template.json -> deploy.config.json
2. Popuni sva polja u deploy.config.json (IP, domen, IBAN, SMTP…)
3. SSH: sshKeyPath ILI sshPassword (root lozinka — samo u deploy.config.json, ne u chat)
4. DNS kod registrara: A @ -> IP, A api -> IP (pre deploya ili odmah posle)
5. Javi u Cursor chat: "config spreman" ili "kreni deploy"

Pokretanje (Cursor agent ili ti):
  .\scripts\deploy-from-local-secrets.ps1 -Bootstrap
  .\scripts\deploy-from-local-secrets.ps1

Fajlovi koje agent generiše (gitignored):
  ..\.env.vps.prod
  ..\atina-platform\atina\.env.vps.prod
  ..\apps\omnigroup-web\.env.vps.production
