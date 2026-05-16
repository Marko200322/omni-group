import { Test } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('validate maps JWT payload sub to userId and passes email through', async () => {
    const result = await strategy.validate({
      sub: 'user-uuid',
      email: 'caller@example.com',
    });

    expect(result).toEqual({
      userId: 'user-uuid',
      email: 'caller@example.com',
    });
  });
});
