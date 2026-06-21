import { listAvatarAgents } from '../../modules/video-meetings/avatar/avatar-agent.config';

describe('avatar agent roster', () => {
  it('includes five support agents by default', () => {
    const agents = listAvatarAgents('support');
    expect(agents.length).toBeGreaterThanOrEqual(5);
    expect(agents.map((a) => a.id)).toEqual(
      expect.arrayContaining(['mila', 'stefan', 'jelena', 'nemanja', 'sara'])
    );
    expect(agents[0].backgroundUrl).toContain('avatars/backgrounds/');
    expect(agents[0].avatarUrl).toContain('avatars/portraits/');
  });

  it('includes six sales agents by default', () => {
    const agents = listAvatarAgents('sales');
    expect(agents.length).toBeGreaterThanOrEqual(6);
    expect(agents.map((a) => a.id)).toEqual(
      expect.arrayContaining(['nikola', 'ana', 'marko', 'ivana', 'luka', 'teodora'])
    );
  });
});
