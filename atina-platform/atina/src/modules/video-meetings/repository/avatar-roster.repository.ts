import { query } from '../../../database/connection';
import type { AgentType } from '../avatar/avatar-agent.personas';
import type { AvatarAgentDefinition } from '../avatar/avatar-agent.roster';

export type AvatarRosterRow = {
  agent_type: AgentType;
  id: string;
  name: string;
  title: string;
  avatar_url: string;
  background_url: string;
  voice_id: string;
  persona: string;
  greeting: string;
  sort_order: number;
};

function mapRow(row: AvatarRosterRow): AvatarAgentDefinition {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? '',
    avatarUrl: row.avatar_url ?? '',
    backgroundUrl: row.background_url ?? '',
    voiceId: row.voice_id ?? '',
    persona: row.persona ?? '',
    greeting: row.greeting ?? '',
  };
}

export class AvatarRosterRepository {
  async listByTeam(agentType: AgentType): Promise<AvatarAgentDefinition[]> {
    const { rows } = await query<AvatarRosterRow>(
      `SELECT agent_type, id, name, title, avatar_url, background_url, voice_id, persona, greeting, sort_order
       FROM avatar_agent_roster
       WHERE agent_type = $1 AND enabled = true
       ORDER BY sort_order ASC, name ASC`,
      [agentType]
    );
    return rows.map(mapRow);
  }
}
