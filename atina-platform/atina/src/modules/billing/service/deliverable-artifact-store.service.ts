import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { FulfillmentArtifact } from '../lib/deliverable-handlers/types';

const ROOT = path.resolve(process.cwd(), 'data', 'client-deliverables');

export class DeliverableArtifactStoreService {
  private dir(userId: string, paymentId: string): string {
    return path.join(ROOT, userId, paymentId);
  }

  saveBuffer(input: {
    userId: string;
    paymentId: string;
    filename: string;
    buffer: Buffer;
    type: string;
    downloadLabel?: string;
  }): FulfillmentArtifact {
    const dir = this.dir(input.userId, input.paymentId);
    fs.mkdirSync(dir, { recursive: true });
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const full = path.join(dir, safeName);
    fs.writeFileSync(full, input.buffer);
    return {
      type: input.type,
      filename: safeName,
      storagePath: full,
      downloadLabel: input.downloadLabel ?? safeName,
    };
  }

  saveText(input: {
    userId: string;
    paymentId: string;
    filename: string;
    content: string;
    type: string;
    downloadLabel?: string;
  }): FulfillmentArtifact {
    return this.saveBuffer({
      ...input,
      buffer: Buffer.from(input.content, 'utf8'),
    });
  }

  contentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
