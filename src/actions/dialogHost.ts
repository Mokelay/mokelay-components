import { computed, createApp, defineAsyncComponent, h, type App as VueApp } from 'vue';
import { loadMokelayPage } from '@/pages/domain';
import type { PageDataSourceConfig, PageRuntimeContext } from '@/pages/runtimeContext';
import type { MokelayBlock } from '@/blocks/types';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';

export type ActionPageDialogRequest = {
  title: string;
  pageUUID: string;
  pageSource?: 'user' | 'system';
  context?: PageRuntimeContext;
  ancestry?: string[];
};

type DialogHandle = {
  close: (result?: unknown) => void;
};

const MPage = defineAsyncComponent(() => import('@/blocks/MPage.vue'));

export async function showActionPageDialog(request: ActionPageDialogRequest): Promise<unknown> {
  if (typeof document === 'undefined') {
    return null;
  }

  const pageUUID = request.pageUUID.trim();
  const ancestry = (request.ancestry ?? []).map((item) => item.trim()).filter(Boolean);
  if (!pageUUID) {
    throw new Error('请选择要打开的页面。');
  }
  if (ancestry.includes(pageUUID)) {
    return await showActionPageReferenceError(
      request.title,
      `检测到循环页面引用：${[...ancestry, pageUUID].join(' → ')}`
    );
  }

  const page = await loadMokelayPage(pageUUID, request.pageSource);
  return await new Promise((resolve) => {
    let closed = false;
    let dialogApp: VueApp<Element> | null = null;
    const dialogContainer = document.createElement('div');
    const close = (result?: unknown) => {
      if (closed) return;
      closed = true;
      dialogApp?.unmount();
      dialogContainer.remove();
      dialogApp = null;
      resolve(result ?? null);
    };

    dialogContainer.setAttribute('data-testid', 'action-dialog-host-container');
    document.body.appendChild(dialogContainer);

    dialogApp = createApp({
      setup() {
        const handleKeydown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        };

        return () => h(ActionDialogContent, {
          title: request.title,
          pageId: page.uuid,
          blocks: page.blocks,
          dataSources: page.dataSources,
          runtimeContext: request.context ?? {},
          onClose: close,
          onKeydown: handleKeydown
        });
      }
    });
    dialogApp.provide(PageReferenceAncestryKey, computed(() => ancestry));
    dialogApp.mount(dialogContainer);
  });
}

function showActionPageReferenceError(title: string, message: string): Promise<unknown> {
  return new Promise((resolve) => {
    let closed = false;
    let dialogApp: VueApp<Element> | null = null;
    const dialogContainer = document.createElement('div');
    const close = () => {
      if (closed) return;
      closed = true;
      dialogApp?.unmount();
      dialogContainer.remove();
      dialogApp = null;
      resolve(null);
    };

    dialogContainer.setAttribute('data-testid', 'action-dialog-host-container');
    document.body.appendChild(dialogContainer);
    dialogApp = createApp({
      setup() {
        const handleKeydown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        };
        return () => h(ActionDialogErrorContent, {
          title,
          message,
          onClose: close,
          onKeydown: handleKeydown
        });
      }
    });
    dialogApp.mount(dialogContainer);
  });
}

const ActionDialogErrorContent = {
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    onClose: { type: Function, required: true },
    onKeydown: { type: Function, required: true }
  },
  setup(props: {
    title: string;
    message: string;
    onClose: DialogHandle['close'];
    onKeydown: (event: KeyboardEvent) => void;
  }) {
    return () => h('div', {
      class: 'action-dialog-overlay',
      'data-testid': 'action-dialog-overlay'
    }, [
      h('section', {
        class: 'action-dialog-panel',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'action-dialog-error-title',
        tabindex: -1,
        'data-testid': 'action-dialog',
        onKeydown: props.onKeydown
      }, [
        h('div', { class: 'action-dialog-header' }, [
          h('h2', {
            id: 'action-dialog-error-title',
            class: 'action-dialog-title',
            'data-testid': 'action-dialog-title'
          }, props.title || '页面引用错误'),
          h('button', {
            type: 'button',
            class: 'action-dialog-close',
            'data-testid': 'action-dialog-close',
            'aria-label': '关闭',
            title: '关闭',
            onClick: () => props.onClose()
          }, '×')
        ]),
        h('div', {
          class: 'action-dialog-body action-dialog-error',
          'data-testid': 'action-dialog-body'
        }, [
          h('strong', {}, '无法打开引用页面'),
          h('p', { 'data-testid': 'action-dialog-reference-error' }, props.message)
        ])
      ])
    ]);
  }
};

const ActionDialogContent = {
  props: {
    title: {
      type: String,
      required: true
    },
    blocks: {
      type: Array,
      required: true
    },
    dataSources: {
      type: Array,
      required: false,
      default: () => []
    },
    pageId: {
      type: String,
      required: true
    },
    runtimeContext: {
      type: Object,
      required: true
    },
    onClose: {
      type: Function,
      required: true
    },
    onKeydown: {
      type: Function,
      required: true
    }
  },
  setup(props: {
    title: string;
    pageId: string;
    blocks: MokelayBlock[];
    dataSources?: PageDataSourceConfig[];
    runtimeContext: PageRuntimeContext;
    onClose: DialogHandle['close'];
    onKeydown: (event: KeyboardEvent) => void;
  }) {
    return () => h('div', {
      class: 'action-dialog-overlay',
      'data-testid': 'action-dialog-overlay'
    }, [
      h('section', {
        class: 'action-dialog-panel',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'action-dialog-title',
        tabindex: -1,
        'data-testid': 'action-dialog',
        onKeydown: props.onKeydown
      }, [
        h('div', { class: 'action-dialog-header' }, [
          h('h2', {
            id: 'action-dialog-title',
            class: 'action-dialog-title',
            'data-testid': 'action-dialog-title'
          }, props.title),
          h('button', {
            type: 'button',
            class: 'action-dialog-close',
            'data-testid': 'action-dialog-close',
            'aria-label': '关闭',
            title: '关闭',
            onClick: () => props.onClose()
          }, [
            h('svg', {
              class: 'action-dialog-close-icon',
              viewBox: '0 0 24 24',
              width: '18',
              height: '18',
              'aria-hidden': 'true',
              focusable: 'false'
            }, [
              h('path', {
                d: 'M18 6 6 18M6 6l12 12',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2'
              })
            ])
          ])
        ]),
        h('div', {
          class: 'action-dialog-body',
          'data-testid': 'action-dialog-body'
        }, [
          h(MPage, {
            edit: false,
            value: props.blocks,
            pageId: props.pageId,
            dataSources: props.dataSources,
            runtimeContext: props.runtimeContext,
            onClose: props.onClose
          })
        ])
      ])
    ]);
  }
};
