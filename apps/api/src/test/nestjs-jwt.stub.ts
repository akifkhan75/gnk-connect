export class JwtService {
  sign = jest.fn().mockReturnValue('jwt');
  verifyAsync = jest.fn();
  constructor(_opts?: unknown) {}
}
