import { json } from '@sveltejs/kit';
import { storeAsset } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';

export async function PUT({ request }) {
  return withSpan('authoring.upload_asset', async (span) => {
    const data = await request.formData();
    const asset_id = data.get('path');
    const file = data.get('file')?.valueOf();
    span.setAttribute('app.asset.id', String(asset_id));
    try {
      span.setAttribute('app.asset.size', Number(file?.size ?? 0));
      span.setAttribute('app.asset.mime', String(file?.type ?? ''));
    } catch {}
    await storeAsset(asset_id, file);
    return json({ path: asset_id });
  });
}
