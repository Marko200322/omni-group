import dotenv from 'dotenv';
import path from 'path';
import { applyEnvAggregator } from './apply-env-aggregator';

applyEnvAggregator('atina');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
