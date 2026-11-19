// @vitest-environment happy-dom
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import { configureMokelayComponents } from '@/runtime/adapter';
import { listApiDomains } from '@/datasource/apiDomains';
import { createPreviewBlockRuntime, PreviewBlockRuntimeKey } from '@/runtime/previewBlockRuntime';
import { preloadMokelayBlocks } from './runtimeRegistry';
import MokelayBlockRenderer from './MokelayBlockRenderer.vue';
import type { MokelayBlock } from './types';

const pageFile = resolve(process.cwd(), '../mokelay-server/server/assets/lark/pages/reimbursement_201.json');
const page = existsSync(pageFile) ? JSON.parse(readFileSync(pageFile, 'utf8')) : undefined;
afterEach(() => { vi.unstubAllGlobals(); configureMokelayComponents({}); });

it.skipIf(!page).each(['no', 'yes'])('runs the reimbursement DSL with restored hints %s, saves, retries and submits once', async (showHelp) => {
  const client = axios.create();
  vi.spyOn(client, 'get').mockResolvedValue({ data: { ok: true, data: { domains: [{ uuid: 'mokelay', alias: 'Local', host: 'http://localhost:8787' }] } } });
  configureMokelayComponents({ apiClient: client });
  await listApiDomains(true);
  await preloadMokelayBlocks(['MHeading', 'MRichText', 'MForm', 'MPageState', 'MButton', 'MInput', 'MSelectField', 'MTextareaField']);
  const runtime = createPreviewBlockRuntime();
  const writes: { url: string; body: Record<string, unknown> }[] = [];
  const record = { id: 'test-id', version: 0, status: 'draft', show_help: showHelp, category: 'travel', fiat: '0.00', crypto: '0.00', loan: '0.00', settlement: '0.00', note: '' };
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'GET') return new Response(JSON.stringify({ ok: true, data: { record, options: { category: [{ label: '差旅费', value: 'travel' }] } } }), { headers: { 'Content-Type': 'application/json' } });
    const body = JSON.parse(String(options?.body)); writes.push({ url, body });
    if (writes.length === 1) throw new TypeError('Lost response');
    Object.assign(record, body, { version: Number(body.version) + 1 });
    return new Response(JSON.stringify({ ok: true, data: { record } }), { headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  const wrapper = mount(defineComponent({ setup: () => () => h('div', page.blocks.map((block: MokelayBlock) => h(MokelayBlockRenderer, { block }))) }), {
    global: { provide: { [PreviewBlockRuntimeKey as symbol]: runtime } }
  });
  try {
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid=page-dsl-block-MHeading]').text()).toBe('201.报销申请');
    expect(wrapper.get('[data-testid=page-dsl-block-MRichText]').text()).toBe('将自动保存填写内容');
    expect(wrapper.getComponent({ name: 'MForm' }).find('header, h1').exists()).toBe(false);
    expect(wrapper.get('output#expense-approval_amount').text()).toBe('0');
    expect(wrapper.findAll('.ce-form-tool__hint')).toHaveLength(showHelp === 'yes' ? 5 : 0);
    await new Promise(resolve => setTimeout(resolve, 450));
    expect(writes).toHaveLength(0);
    const select = wrapper.findAll('select')[0];
    await select.setValue('yes');
    await flushPromises();
    expect(wrapper.findAll('.ce-form-tool__hint')).toHaveLength(5);
    await select.setValue('no');
    await select.setValue('yes');
    await select.setValue('no');
    await flushPromises();
    expect(wrapper.findAll('.ce-form-tool__hint')).toHaveLength(0);
    expect(wrapper.findAll('.ce-form-tool__description')).toHaveLength(2);
    const note = wrapper.get('textarea');
    await note.setValue('first');
    await vi.waitFor(() => expect(wrapper.text()).toContain('Lost response'));
    await note.setValue('latest');
    const button = wrapper.get('[data-testid="reimbursement-submit"]');
    await button.trigger('click'); await button.trigger('click');
    await flushPromises();
    expect(writes.map(write => [write.url.split('/').pop(), write.body.version, write.body.note])).toEqual([
      ['reimbursement_201_save_draft', 0, 'first'],
      ['reimbursement_201_save_draft', 0, 'first'],
      ['reimbursement_201_save_draft', 1, 'latest'],
      ['reimbursement_201_submit', 2, 'latest']
    ]);
    expect(writes[1].body).toEqual(writes[0].body);
    expect(wrapper.text()).toContain('已提交 · 申请单号 test-id');
    expect(wrapper.find('[data-testid="reimbursement-submit"]').exists()).toBe(false);
    expect(note.attributes('disabled')).toBeDefined();
    expect(wrapper.get('output#expense-approval_amount').text()).toBe('0');
  } finally { wrapper.unmount(); }
});
