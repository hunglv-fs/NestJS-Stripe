import { startPostgresContainer } from './testcontainers-setup';

export default async () => {
  console.log('🚀 Setting up E2E test environment...');
  await startPostgresContainer();
  console.log('✅ E2E test environment ready');
};
