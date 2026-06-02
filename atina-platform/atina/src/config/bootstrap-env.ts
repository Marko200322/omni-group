import dotenv from 'dotenv';
import path from 'path';
import { applyEnvAggregator } from './apply-env-aggregator';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
applyEnvAggregator('atina');
