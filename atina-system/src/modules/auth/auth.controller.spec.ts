import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  it('register and login delegate to AuthService', async () => {
    const authService = {
      register: jest.fn().mockResolvedValue({ access_token: 't', user: {} }),
      login: jest.fn().mockResolvedValue({ access_token: 't2', user: {} }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    const controller = moduleRef.get(AuthController);
    const reg: RegisterDto = { email: 'a@b.com', password: '12345678' };
    const login: LoginDto = { email: 'a@b.com', password: 'x' };

    await expect(controller.register(reg)).resolves.toEqual({
      access_token: 't',
      user: {},
    });
    expect(authService.register).toHaveBeenCalledWith(reg);

    await expect(controller.login(login)).resolves.toEqual({
      access_token: 't2',
      user: {},
    });
    expect(authService.login).toHaveBeenCalledWith(login);
  });
});
