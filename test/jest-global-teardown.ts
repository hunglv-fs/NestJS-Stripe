import { stopPostgresContainer } from './testcontainers-setup';

export default async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  await stopPostgresContainer();
  console.log('✅ E2E test environment cleaned up');
};
