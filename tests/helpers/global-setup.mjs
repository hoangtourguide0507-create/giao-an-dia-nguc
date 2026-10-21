import { rmSync, mkdirSync } from 'node:fs';
import { RAW_DIR } from './coverage.mjs';
export default () => { rmSync(RAW_DIR, { recursive: true, force: true }); mkdirSync(RAW_DIR, { recursive: true }); };
