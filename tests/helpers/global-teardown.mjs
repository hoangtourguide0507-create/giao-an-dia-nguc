import { report } from './coverage.mjs';
export default async () => { if (!process.env.NO_COVERAGE) await report(); };
