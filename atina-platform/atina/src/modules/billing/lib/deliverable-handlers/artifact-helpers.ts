import { getDeliverable } from '../deliverable-catalog';
import { DeliverableArtifactStoreService } from '../../service/deliverable-artifact-store.service';
import { generateDeliverablePdfBuffer } from '../../service/deliverable-document-pdf.service';
import type { StructuredDeliverableDoc } from '../../service/deliverable-document-generator.service';
import type { FulfillmentArtifact, FulfillmentContext } from './types';

const store = new DeliverableArtifactStoreService();

export async function persistDeliverablePdf(input: {
  ctx: FulfillmentContext;
  doc: StructuredDeliverableDoc;
  artifactType: string;
  filename: string;
}): Promise<FulfillmentArtifact> {
  const deliverable = getDeliverable(input.ctx.deliverableId);
  const pdf = await generateDeliverablePdfBuffer({
    brandName: 'Omni Group',
    title: input.doc.title,
    subtitle: input.doc.subtitle,
    clientName: input.ctx.clientName,
    deliverableName: deliverable?.name ?? input.ctx.deliverableId,
    sections: input.doc.sections,
  });
  return store.saveBuffer({
    userId: input.ctx.userId,
    paymentId: input.ctx.paymentId,
    filename: input.filename,
    buffer: pdf,
    type: input.artifactType,
    downloadLabel: input.doc.title,
  });
}

export async function persistMarkdownBundle(input: {
  ctx: FulfillmentContext;
  doc: StructuredDeliverableDoc;
  artifactType: string;
}): Promise<FulfillmentArtifact> {
  const md = [
    `# ${input.doc.title}`,
    input.doc.subtitle ? `\n_${input.doc.subtitle}_\n` : '',
    ...input.doc.sections.flatMap((s) => [`\n## ${s.heading}\n`, s.body]),
  ].join('\n');
  return store.saveText({
    userId: input.ctx.userId,
    paymentId: input.ctx.paymentId,
    filename: `${input.artifactType}.md`,
    content: md,
    type: input.artifactType,
    downloadLabel: `${input.doc.title} (Markdown)`,
  });
}
