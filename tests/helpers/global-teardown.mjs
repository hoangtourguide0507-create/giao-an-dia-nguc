import { report } from './coverage.mjs';
export default async () => { if (process.env.COVERAGE) await report(); };
