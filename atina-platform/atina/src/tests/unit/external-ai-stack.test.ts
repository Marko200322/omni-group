import {
  EXTERNAL_AI_STACK,
  buildExternalAiStackStatus,
  getExternalAiStackEnvKeys,
} from '../../modules/billing/lib/external-ai-stack';

describe('external AI stack catalog', () => {
  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    Object.keys(prev).forEach((k) => delete prev[k]);
  });

  function setEnv(key: string, value: string) {
    prev[key] = process.env[key];
    process.env[key] = value;
  }

  it('lists all sector vendors from the owner budget table', () => {
    const ids = EXTERNAL_AI_STACK.map((v) => v.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'clay',
        'salesforge',
        'intercom',
        'sierra',
        'make',
        'n8n',
        'ramp',
        'vic_ai',
        'jasper',
        'predis',
        'devin',
        'replit_agent',
        'heygen',
        'elevenlabs',
        'crewai',
        'langchain',
      ])
    );
    expect(EXTERNAL_AI_STACK.length).toBe(16);
  });

  it('reports configured vs missing without leaking values', () => {
    setEnv('CLAY_API_KEY', 'clay_test');
    setEnv('MAKE_API_KEY', 'make_test');
    // MAKE needs webhook for connectionReady
    const status = buildExternalAiStackStatus();
    const clay = status.vendors.find((v) => v.id === 'clay')!;
    const make = status.vendors.find((v) => v.id === 'make')!;
    expect(clay.keysConfigured).toBe(true);
    expect(clay.connectionReady).toBe(true);
    expect(make.keysConfigured).toBe(true);
    expect(make.connectionReady).toBe(false);
    expect(make.missingConnectionKeys).toContain('MAKE_WEBHOOK_URL');
    expect(JSON.stringify(status)).not.toMatch(/clay_test|make_test/);
  });

  it('exposes M4-relevant env keys for docs/wiring', () => {
    const keys = getExternalAiStackEnvKeys({ fromPhaseMax: 'M4' });
    expect(keys).toEqual(
      expect.arrayContaining(['CLAY_API_KEY', 'INTERCOM_API_KEY', 'MAKE_WEBHOOK_URL', 'ELEVENLABS_API_KEY'])
    );
    expect(keys).not.toContain('DEVIN_API_KEY');
    expect(keys).not.toContain('JASPER_API_KEY');
  });
});
