describe('marketing → reinvestment bridge', () => {
  it('returns UNAVAILABLE fail-soft when MarketingService throws', async () => {
    jest.resetModules();
    jest.doMock('../../modules/marketing/service/marketing.service', () => ({
      MarketingService: jest.fn().mockImplementation(() => ({
        getOverview: jest.fn().mockRejectedValue(new Error('db_down')),
      })),
    }));

    const { fetchMarketingSignalsForReinvestment } = await import(
      '../../modules/marketing/lib/reinvestment-bridge'
    );
    const signal = await fetchMarketingSignalsForReinvestment();
    expect(signal.kind).toBe('UNAVAILABLE');
    expect(signal.notes).toEqual(expect.arrayContaining(['marketing_unavailable']));
  });
});
