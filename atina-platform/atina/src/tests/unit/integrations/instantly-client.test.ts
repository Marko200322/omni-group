import { InstantlyClient, resetInstantlyClientForTests } from '../../../integrations/instantly-client';

jest.mock('../../../config', () => ({
  config: {
    instantly: {
      apiKey: 'test-key',
      campaignId: '019ffad0-89c1-7bf0-986e-1bf7951211bb',
      baseUrl: 'https://api.instantly.ai',
    },
  },
}));

describe('InstantlyClient', () => {
  beforeEach(() => {
    resetInstantlyClientForTests();
    global.fetch = jest.fn();
  });

  it('isConfigured when api key and campaign id present', () => {
    expect(new InstantlyClient().isConfigured()).toBe(true);
  });

  it('addLeadsToCampaign posts to Instantly API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ created_leads: 1, duplicated_leads: 0 }),
    });

    const client = new InstantlyClient();
    const result = await client.addLeadsToCampaign([
      {
        email: 'ceo@acme.com',
        firstName: 'Jane',
        lastName: 'Doe',
        companyName: 'Acme',
        customVariables: { subject: 'Hello' },
      },
    ]);

    expect(result.created).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.instantly.ai/api/v2/leads/add',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });
});
