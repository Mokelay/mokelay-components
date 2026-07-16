# mokelay-components

Mokelay 页面 DSL 的 Vue 3 纯渲染包。包含 runtime blocks、layouts、processors、actions 和公共结构类型；不包含 EditorJS、工具注册、属性面板或其他编辑态 UI。

```ts
import {
  MButton,
  MokelayBlockRenderer,
  type MokelayPageDocument
} from 'mokelay-components/blocks';
import { applyProcessors } from 'mokelay-components/processors';
import { runActionGraph } from 'mokelay-components/actions';
import { normalizeDatasource } from 'mokelay-components/datasource';
import { loadMokelayPage } from 'mokelay-components/pages';
import 'mokelay-components/style.css';
```

需要宿主能力时，在应用启动阶段调用 `configureMokelayComponents`。纯展示组件、processor 和 action 的纯函数不要求配置 adapter。

`edit` prop 仅为已有 DSL/调用兼容而保留。即使传入 `edit: true`，本包也不会创建 EditorJS、属性编辑器或配置对话框。编辑器工具和 `@clientBlockDoc` 由 `mokelay-editor` 独立维护。

消费者应只使用以下入口，不应依赖 `dist` 或源码深层路径：

- `mokelay-components`
- `mokelay-components/blocks`
- `mokelay-components/processors`
- `mokelay-components/actions`
- `mokelay-components/layouts`
- `mokelay-components/runtime`
- `mokelay-components/datasource`
- `mokelay-components/pages`
- `mokelay-components/global-calls`
- `mokelay-components/global-settings`
- `mokelay-components/style.css`

## 发布

```bash
npm run typecheck
npm run pack:check
npm run release:minor # 需要发布 breaking minor 版本时使用
npm run publish:npm   # 后续 patch 发布会先自动增加版本号
```

先发布组件包，再在 `mokelay-editor` 中升级固定版本依赖。
