import dotenv from 'dotenv';

dotenv.config();

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requiredEnv('DATABASE_URL'),
  JWT_SECRET: requiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: requiredEnv('JWT_EXPIRES_IN'),
  PORT: parseInt(process.env.PORT || '3000', 10),
};
