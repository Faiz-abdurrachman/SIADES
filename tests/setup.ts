import prisma from '../src/config/prisma';

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  if (!process.env.DATABASE_URL.includes('test')) {
    throw new Error('Refusing to run tests on non-test database');
  }
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "DigitalSignature",
      "Document",
      "LetterRequest",
      "LetterType",
      "PopulationEvent",
      "Resident",
      "Family",
      "User",
      "Role"
    CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
