/** Map internal BFF / Atina error codes to user-facing Serbian copy. */
export function describeAtinaError(code: string | undefined): string {
  if (!code) return 'Došlo je do greške. Pokušaj ponovo.';
  const map: Record<string, string> = {
    unauthorized: 'Prijavi se pravim nalogom (ne demo) da koristiš ovu funkciju.',
    no_access_token: 'Sesija nema pristup Atina API-ju — odjavi se i prijavi ponovo.',
    no_session: 'Niste prijavljeni.',
    demo_session: 'Demo režim ne podržava live funkcije.',
    invalid_credentials: 'Pogrešan email ili lozinka.',
    atina_unreachable: 'Atina API nije dostupan. Proveri da li backend radi na portu 3000.',
    session_failed: 'Ne mogu da pokrenem avatar sesiju. Proveri AI/avatar podešavanja u Atina .env.',
    chat_failed: 'Avatar chat trenutno nije dostupan.',
    checkout_failed: 'Greška pri kreiranju uputstva za uplatu.',
    login_failed: 'Prijava nije uspela.',
  };
  if (map[code]) return map[code];
  if (code.startsWith('http_')) return 'Atina API nije odgovorio. Proveri backend.';
  if (code.includes('_failed')) return 'Operacija nije uspela. Pokušaj ponovo.';
  return code;
}
