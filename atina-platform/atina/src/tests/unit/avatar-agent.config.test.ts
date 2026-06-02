import { listAvatarAgents } from '../../modules/video-meetings/avatar/avatar-agent.config';

describe('avatar agent roster', () => {
  it('includes multiple support agents by default', () => {
    const agents = listAvatarAgents('support');
    expect(agents.length).toBeGreaterThanOrEqual(3);
    expect(agents.map((a) => a.id)).toEqual(expect.arrayContaining(['mila', 'stefan', 'jelena']));
  });

  it('includes multiple sales agents by default', () => {
    const agents = listAvatarAgents('sales');
    expect(agents.length).toBeGreaterThanOrEqual(4);
    expect(agents.map((a) => a.id)).toEqual(
      expect.arrayContaining(['nikola', 'ana', 'marko', 'ivana'])
    );
  });
});
