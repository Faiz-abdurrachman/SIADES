import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { loginSchema, LoginInput } from '../../validators/auth.validator';
import { findUserByEmail } from './auth.repository';
import { AuthenticationError } from '../../utils/appError';

const INVALID_CREDENTIALS = 'Invalid email or password';

export async function login(input: LoginInput): Promise<string> {
  const { email, password } = loginSchema.parse(input);

  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  if (!user.isActive || user.deletedAt) {
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return token;
}
