import { config } from '@vue/test-utils';
import { afterEach } from 'vitest';
import { cleanup } from './helpers.js';

afterEach(() => {
  cleanup();
});

// Suppress Vue warnings in tests
config.global.config.warnHandler = () => null;
