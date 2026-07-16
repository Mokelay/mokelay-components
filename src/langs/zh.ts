export const zhMessages = {
  app: {
    title: 'Mokelay Editor',
    subtitle: 'Mokelay页面配置器',
    darkMode: '深色模式',
    dark: '深色',
    light: '浅色',
    language: '语言',
    home: '首页',
    apps: 'Apps',
    datasources: '数据源',
    pageList: '页面列表',
    chinese: '中文',
    english: 'English'
  },
  editor: {
    placeholder: '开始输入你的内容...',
    defaultParagraph: '欢迎使用 Mokelay 编辑器初始化模板。',
    fullscreenEdit: '全屏编辑',
    saveContent: '保存',
    saving: '保存中...',
    saveSuccess: '保存成功',
    saveFailed: '保存失败，请稍后重试',
    previewPage: '预览',
    properties: '属性',
    propertyDialogTitle: '属性设置',
    configJson: '配置 JSON',
    close: '关闭',
    invalidJson: '请输入有效 JSON。',
    events: {
      menu: '事件',
      title: '事件设置',
      add: '添加事件',
      remove: '删除事件',
      empty: '暂无事件。',
      fields: {
        event: '触发事件 event',
        actions: 'Action配置'
      }
    }
  },
  preview: {
    title: '配置预览',
    backToEditor: '返回',
    emptyState: '暂无页面内容。',
    modes: {
      pc: 'PC',
      h5: 'H5',
      ios: 'IOS',
      android: 'Android'
    },
    qrCodeAlt: '预览二维码',
    qrCodeLoading: '二维码生成中...',
    qrCodeFailed: '二维码生成失败，请稍后重试。',
    qrCodeUnavailable: '请先保存页面，再生成 iOS 预览二维码。',
    qrCodePlaceholder: '当前为临时二维码，移动端上线后将替换为真实入口。',
    iosQrCode: 'IOS 预览二维码',
    androidQrCode: 'Android 预览二维码',
    iosQrCodeDescription: '使用 Mokelay iOS App 扫码打开当前预览页。',
    androidQrCodeDescription: '当前为临时二维码，Android 端上线后将替换为真实入口。'
  },
  pageState: {
    keyCount: '{count} 个字段',
    readonly: '只读',
    errors: {
      readonly: '页面状态为只读，不能修改。',
      invalidPath: '状态路径无效。',
      pathRequired: '状态路径不能为空。',
      invalidValue: '状态值必须可序列化为 JSON。',
      objectRequired: '状态根值必须是 JSON 对象。'
    }
  },
  notFound: {
    title: '页面不存在',
    description: '没有找到可渲染的 Mokelay 页面 DSL，请检查地址或返回首页。',
    home: '返回首页'
  },
  globalCalls: {
    ok: '确定',
    cancel: '取消',
    alertRoleLabel: '提示',
    confirmRoleLabel: '确认',
    messageRoleLabel: '消息'
  },
  variableValue: {
    modeLabel: '变量编辑模式',
    modes: {
      input: '常量',
      variable: '变量',
      flow: '高级'
    },
    previous: '上一配置',
    validation: {
      invalidJson: '请输入有效 JSON，或使用变量值。',
      invalidArray: '请输入有效数组 JSON，或使用变量值。',
      invalidObject: '请输入有效对象 JSON，或使用变量值。',
      invalidNumber: '请输入有效数字，或使用变量值。',
      invalidBoolean: '请输入 true 或 false，或使用变量值。'
    },
    actions: {
      insert: '插入变量'
    },
    insert: {
      title: '插入变量',
      search: '搜索变量',
      empty: '暂无可用变量'
    },
    variable: {
      placeholder: '请选择变量',
      blockPlaceholder: '选择组件',
      fieldPlaceholder: '选择数据',
      emptySources: '暂无可读取数据的组件',
      missingBlock: '缺失组件 {blockId}',
      missingPage: '缺失页面 {pageId}',
      currentPage: '当前页',
      dialogPage: '弹窗页',
      legacySource: '旧变量',
      variable: '变量',
      configureProcessors: '配置处理器'
    },
    flow: {
      title: '高级变量流程',
      subtitle: '通过变量、处理器和 if-else 节点编排最终输出值。',
      library: '节点库',
      inspector: '节点属性',
      noSelection: '请选择一个节点。',
      open: '打开画布',
      summary: '流程',
      nodes: {
        variable: '变量',
        constant: '常量',
        processor: '处理器',
        if: 'if-else',
        output: '输出'
      },
      fields: {
        value: '值',
        left: '左值',
        operator: '条件',
        right: '右值'
      },
      validation: {
        singleOutput: '高级流程只能有一个输出节点。'
      }
    }
  },
  input: {
    toolboxTitle: '输入框',
    defaultPlaceholder: '请输入.....',
    propertyPanelTitle: '输入框属性',
    properties: {
      placeholder: '占位提示',
      value: '默认值',
      valuePlaceholder: '请输入默认值'
    }
  },
  link: {
    toolboxTitle: '链接',
    defaultText: '链接',
    defaultUrl: 'https://mokelay.com',
    propertyPanelTitle: '链接属性',
    properties: {
      text: '链接文本',
      url: '链接地址',
      open: '新页面打开'
    }
  },
  advanceInput: {
    toolboxTitle: '高级输入框'
  },
  dividerLine: {
    toolboxTitle: '分割线'
  },
  chart: {
    toolboxTitle: '图表',
    propertyPanelTitle: '图表属性',
    defaultSeriesName: '数据',
    types: {
      line: '折线图',
      bar: '柱状图',
      pie: '饼图'
    },
    properties: {
      type: '图表类型',
      xAxis: '横坐标数据',
      series: '图表数据'
    },
    dataEditor: {
      title: '图表数据设置',
      summary: '{categories} 个分类，{series} 组数据',
      categoryPrefix: '分类',
      sections: {
        grid: '数据表格',
        preview: '预览'
      },
      help: {
        grid: '维护横坐标和 series 数据，保存时会自动保持每组数据长度一致。'
      },
      columns: {
        series: '系列',
        actions: '操作'
      },
      actions: {
        settings: '编辑图表数据',
        addCategory: '新增分类',
        addSeries: '新增系列',
        remove: '删除',
        removeShort: '删'
      },
      validation: {
        emptyCategory: '请至少保留一个非空分类。',
        emptySeries: '请至少保留一组数据。',
        emptySeriesName: '系列名称不能为空。',
        invalidNumber: '每个数据单元格都必须是有效数字。'
      }
    },
    validation: {
      invalidJson: '请输入有效 JSON。'
    }
  },
  tabs: {
    toolboxTitle: '页签',
    propertyPanelTitle: '页签属性',
    properties: {
      tabs: '页签配置',
      activeTabId: '激活页签 ID'
    },
    dataFields: {
      activeTabId: '激活页签 ID',
      activeTab: '激活页签',
      tabs: '页签列表'
    },
    states: {
      empty: '请先配置页签。',
      loading: '页面加载中...',
      loadFailed: '页面加载失败。',
      emptyPage: '当前页签没有页面内容。'
    },
    configEditor: {
      title: '页签配置',
      defaultTabName: '页签 {index}',
      empty: '暂无页签，点击新增页签开始配置。',
      loadingPages: '页面加载中...',
      pageOptionsLoadFailed: '页面列表加载失败，可继续手动输入 pageUUID。',
      summary: {
        savedCount: '已配置 {count} 个页签 · 默认：{active}',
        noActive: '未设置'
      },
      sources: {
        user: '用户页面',
        system: '系统页面'
      },
      columns: {
        active: '默认',
        id: 'ID',
        name: '名称',
        source: '来源',
        pageUUID: '页面 UUID',
        actions: '操作'
      },
      actions: {
        settings: '编辑页签配置',
        add: '新增页签',
        refreshPages: '刷新页面列表',
        clear: '清空配置',
        remove: '删除'
      },
      validation: {
        invalid: '页签配置不合法。',
        emptyId: '页签 ID 不能为空。',
        duplicateId: '页签 ID 不能重复：{id}',
        emptyName: '页签名称不能为空。',
        emptyPageUUID: '页面 UUID 不能为空。',
        invalidActive: '默认激活页签必须存在于页签列表。'
      }
    },
    validation: {
      invalidTabsJson: '请输入有效页签 JSON。'
    }
  },
  editorSelector: {
    toolboxTitle: '组件选择器',
    placeholder: '选择组件'
  },
  form: {
    toolboxTitle: '表单',
    propertyPanelTitle: '表单属性',
    placeholder: '添加表单项',
    properties: {
      layout: '布局方式',
      items: '表单项配置',
      actionBar: '操作栏配置'
    },
    layouts: {
      vertical: '垂直',
      horizontal: '水平'
    },
    actionBarEditor: {
      settingsDialogTitle: '动作工具栏设置',
      empty: '暂无按钮，请先添加按钮。',
      summary: {
        savedCount: '已设置 {count} 个按钮',
        draftCount: '当前 {count} 个按钮'
      },
      sections: {
        layout: '工具栏布局',
        buttons: '按钮配置'
      },
      help: {
        layout: '配置工具栏按钮排列、尺寸和展示模式。'
      },
      fields: {
        align: '对齐',
        size: '尺寸',
        mode: '模式',
        id: '按钮 ID',
        label: '按钮文案',
        variant: '样式',
        disabled: '禁用'
      },
      align: {
        left: '左对齐',
        right: '右对齐',
        spaceBetween: '两端对齐'
      },
      size: {
        small: '小',
        medium: '中',
        large: '大'
      },
      mode: {
        inline: '行内',
        grouped: '分组',
        dropdown: '下拉'
      },
      variant: {
        primary: '主要',
        secondary: '次要',
        ghost: '朴素',
        danger: '危险',
        warning: '警告',
        text: '文本'
      },
      actions: {
        settings: '设置工具栏',
        add: '添加按钮',
        save: '保存',
        cancel: '取消',
        moveUp: '上移',
        moveDown: '下移',
        remove: '删除'
      }
    },
    itemsEditor: {
      settingsDialogTitle: '表单项设置',
      empty: '暂无表单项，请先设置字段。',
      summary: {
        savedCount: '已设置 {count} 个表单项',
        draftCount: '当前 {count} 个表单项'
      },
      sections: {
        fields: '批量导入字段',
        items: '表单项二次设置'
      },
      columns: {
        label: '字段文本',
        variable: '变量名',
        layout: '布局方式',
        editor: '组件类型',
        actions: '操作'
      },
      placeholders: {
        label: '请输入字段文本',
        variable: '请输入变量名'
      },
      actions: {
        settings: '设置表单项',
        save: '保存',
        cancel: '取消',
        moveUp: '上移',
        moveDown: '下移',
        remove: '删除'
      },
      help: {
        fields: '使用字段编辑器批量导入字段，保存字段后会同步生成或移除表单项。'
      }
    }
  },
  advanceTable: {
    toolboxTitle: '高级表格',
    propertyPanelTitle: '高级表格属性',
    defaultColumnName: '列',
    empty: '暂无数据',
    noColumns: '请先设置表格列',
    noDatasource: '没有数据源',
    loading: '正在加载数据...',
    loadFailed: '数据源加载失败',
    missingMatchedField: '请先匹配列表数据字段',
    invalidMatchedData: '列表数据字段必须是对象数组',
    selectAll: '全选',
    selectRow: '选择行',
    properties: {
      index: '显示序号列',
      selection: '显示多选列',
      showPageBreak: '显示分页',
      columns: '列配置',
      data: '数据源',
      ds: '数据源'
    },
    pagination: {
      label: '分页',
      summary: '第 {start}-{end} 条，共 {total} 条 · 第 {page} / {totalPages} 页',
      previous: '上一页',
      next: '下一页'
    },
    columnsEditor: {
      settingsDialogTitle: '高级表格列设置',
      empty: '暂无列，请先设置字段。',
      customContent: '自定义单元格内容，将原样保留。',
      summary: {
        savedCount: '已设置 {count} 列',
        draftCount: '当前 {count} 列'
      },
      sections: {
        fields: '批量导入字段',
        columns: '列二次设置'
      },
      columns: {
        name: '列名',
        variable: '字段变量',
        width: '宽度',
        fixed: '固定列',
        template: '文本模板',
        actions: '操作'
      },
      placeholders: {
        name: '请输入列名',
        variable: '请输入字段变量',
        width: '自动',
        template: '例如：{{name}}'
      },
      fixed: {
        none: '不固定',
        left: '左固定',
        right: '右固定'
      },
      actions: {
        settings: '设置列',
        save: '保存',
        cancel: '取消',
        moveUp: '上移',
        moveDown: '下移',
        resetTemplate: '重置模板',
        remove: '删除'
      },
      help: {
        fields: '使用字段编辑器批量导入字段，保存字段后会同步生成或移除表格列。'
      }
    },
    datasourceFields: {
      data: '列表数据',
      page: '当前页',
      pageSize: '每页条数',
      total: '总数',
      search: '搜索条件'
    },
    defaultRows: {
      first: {
        name: 'Mokelay 页面',
        status: '设计中',
        tag: '设计',
        owner: '产品团队',
        linkText: '官网',
        linkUrl: 'https://mokelay.com'
      },
      second: {
        name: '高级表格',
        status: '可预览',
        tag: '预览',
        owner: '编辑器团队',
        linkText: '文档',
        linkUrl: 'https://editor.mokelay.com'
      }
    }
  },
  datasource: {
    toolboxTitle: '数据源编辑器',
    title: '数据源',
    settingsDialogTitle: '数据源设置',
    empty: '暂无配置项',
    emptySchema: '还没有字段配置，请先选择一条响应数据的 Schema。',
    emptySelectedFields: '暂无已选择字段。',
    noSelectableFields: '当前 Schema 中没有可选择的字段。',
    noFieldsMatchingPath: '没有匹配该路径的字段。',
    summary: {
      domain: '域名',
      path: 'Path',
      method: '方法',
      emptyDomain: '未选择域名',
      emptyPath: '未设置 Path',
      emptyMethod: '未设置方法'
    },
    fields: {
      domain: 'API 域名',
      path: 'API Path',
      method: '调用方法',
      importSource: '导入来源',
      apiSource: '接口来源',
      mokelayApi: 'Mokelay API',
      apifoxProject: 'APIFox 项目',
      apifoxApiId: 'API ID',
      key: 'Key',
      value: '值',
      mock: 'Mock 数据',
      jsonSchema: 'JSON Schema',
      responseExample: '响应示例数据',
      responseExampleInput: 'JSON 输入',
      responseExamplePreview: '树形预览',
      responseExamplePreviewEmpty: '输入有效 JSON 后将在这里展示树形结构',
      responseExamplePlaceholder: '请输入有效的 JSON 响应示例数据',
      generatedFields: '字段数',
      dataType: '数据类型',
      allDataTypes: '全部数据类型',
      pathDepth: '路径深度',
      fieldPath: '字段路径',
      searchFieldsByPath: '按字段路径搜索',
      selectedFields: '已选择字段',
      availableFields: '可选择字段',
      required: '必填'
    },
    sections: {
      headers: 'Header',
      queries: 'Query',
      body: 'Body',
      importApi: '导入 API 信息',
      requestConfig: '请求配置',
      responseConfig: '响应配置',
      fieldSelection: '字段选择',
      externalFieldMatching: '外部字段匹配'
    },
    actions: {
      add: '添加',
      added: '已添加',
      remove: '删除',
      refresh: '刷新',
      refreshing: '刷新中...',
      settings: '数据源设置',
      importApi: '导入',
      importingApi: '导入中...',
      addResponseExample: '添加响应数据',
      cancel: '取消',
      capture: '抓取',
      captureResponseExample: 'Mock抓取响应示例数据',
      capturingResponseExample: '正在抓取响应示例数据...',
      selectSchema: '选择该 Schema',
      translateFields: '翻译为中文',
      translatingFields: '翻译中...',
      previewField: '预览',
      fullSchema: '完整 Schema'
    },
    responseMock: {
      title: '配置请求 Mock 数据',
      help: '填写本次抓取使用的临时 Mock 数据。这些数据只用于请求，不会覆盖请求配置中的值。'
    },
    help: {
      responseConfig: '抓取或编写响应示例数据，并选择其中一条生成字段配置。',
      fieldSelection: '从可选择字段中添加需要给组件使用的字段。',
      externalFieldMatching: '把组件需要的外部字段匹配到已选择字段。'
    },
    matching: {
      empty: '暂无外部字段。',
      unmatched: '未匹配',
      unmatchedCount: '{count} 个字段未匹配'
    },
    schemaTypes: {
      object: '对象',
      array: '列表',
      string: '文本',
      number: '数字',
      boolean: '开关',
      null: '空值',
      union: '联合'
    },
    componentHints: {
      text: '文本',
      number: '数字',
      switch: '开关',
      object: '对象',
      array: '列表'
    },
    processors: {
      dialogTitle: '字段处理器',
      add: '添加处理器',
      apply: '应用',
      configure: '配置处理器',
      view: '查看处理器',
      count: '{count} 个处理器',
      empty: '暂未配置处理器。',
      up: '上移',
      down: '下移',
      unsupported: '该处理器当前无法识别，配置会被保留，也可以删除。',
      incompatible: '该处理器与当前字段类型不兼容，配置会被保留，也可以删除。',
      preview: {
        title: '字段数据预览',
        example: '响应示例数据',
        unavailable: '不可用',
        noExamples: '暂无有效的响应示例数据，请先添加或修正响应数据。',
        finalValue: '最终呈现数据',
        finalValueHelp: '按字段路径提取并执行 Processor 后，组件将获得的数据。',
        extractedValue: 'Processor 处理前数据',
        extractedValueHelp: '仅按字段路径从响应示例中提取的数据。',
        pathNotFound: '当前响应示例中不存在该字段路径。',
        invalidPath: '字段路径格式无效，无法预览。',
        invalidResult: 'Processor 返回了无法展示的非 JSON 数据。',
        unsupportedProcessor: '字段包含无法识别的 Processor，暂时无法生成预览。',
        invalidProcessor: 'Processor 配置无效，暂时无法生成预览。',
        failed: '字段数据预览失败。'
      },
      trim: {
        title: '去除首尾空格',
        description: '字符串会去除首尾空格，其他数据类型保持原值。'
      },
      aiDslRequestContext: {
        title: '组装 AI DSL 请求上下文',
        description: '把请求 JSON 与最近成功会话合成为 AI DSL 生成 payload。',
        fields: {
          history: '会话历史（JSON 数组或模板）',
          historyOrder: '会话历史排列顺序',
          historyLimit: '最近历史轮数',
          includeHistoryInRequirement: '将历史摘要加入需求文档',
          includeHistoryInDslContext: '将历史摘要加入 DSL 上下文'
        },
        historyOrders: {
          newestFirst: '最新到最早',
          oldestFirst: '最早到最新'
        },
        errors: {
          invalidHistory: '请输入合法 JSON。',
          invalidLimit: '历史轮数必须是大于或等于 0 的数字。'
        }
      },
      mergeData: {
        title: '合并数据',
        description: '为对象或列表项浅合并字段。',
        fields: { data: '合并字段（JSON 对象）' }
      },
      filter: {
        title: '列表过滤',
        description: '按条件过滤列表数据。',
        addCondition: '添加条件',
        empty: '没有过滤条件时将保留所有列表项。',
        fields: {
          type: '条件关系',
          variable: '字段路径',
          condition: '判断条件',
          value: '比较值（JSON）'
        },
        conditions: {
          eq: '等于',
          gt: '大于',
          lt: '小于',
          is_empty: '为空',
          is_not_empty: '不为空'
        }
      },
      dateTimeFormat: {
        title: '日期时间格式化',
        description: '按浏览器本地时区格式化日期时间。',
        custom: '自定义',
        fields: { preset: '预设格式', format: '格式' }
      },
      randomId: {
        title: '随机标识',
        description: '为空值生成短随机字符串，非空字符串可按配置保留。',
        fields: {
          prefix: '前缀',
          length: '长度',
          alphabet: '字符集',
          lowerCase: '转小写',
          when: '生成时机'
        },
        when: {
          empty: '仅为空时',
          always: '总是生成'
        }
      },
      validation: {
        required: '此项不能为空。',
        jsonObject: '请输入有效的 JSON 对象。'
      }
    },
    validation: {
      invalidJsonSchema: '请输入符合数据格式的 JSON Schema。',
      invalidNumber: '请输入有效数字。',
      invalidObject: '请输入标准 JSON 对象。',
      invalidArray: '请输入标准 JSON 数组。',
      invalidResponseExample: '请输入有效的 JSON 响应示例数据。',
      missingResponseExample: '请先填写响应示例数据。',
      missingFile: '请选择 Body 中的文件。',
      fixBodyBeforeSchema: '请先修正 Body 中的 Mock 数据。',
      fixMockBeforeCapture: '请先修正请求 Mock 数据。',
      nonJsonResponse: 'API 响应不是 JSON 数据。',
      invalidJsonResponse: 'API 响应不是有效 JSON 数据。',
      apiRequestFailed: 'API 请求失败：',
      missingApiDomain: '请选择 API 域名。',
      apiDomainNotFound: '没有找到对应的 API 域名。',
      invalidApiDomainList: 'API 域名列表无效。',
      emptyArraySchema: '空数组无法推断 JSON Schema。',
      mixedArraySchema: '数组中包含无法合并的类型，无法推断 JSON Schema。',
      translateFieldsFailed: '字段翻译失败，请稍后重试。'
    },
    import: {
      apiSources: {
        user: '用户创建接口',
        system: '系统接口'
      },
      sources: {
        mokelay: 'Mokelay 编排接口',
        apifox: 'APIFox 接口'
      },
      placeholders: {
        apifoxApiId: '请输入 API ID'
      },
      emptyMokelayApis: '暂无 Mokelay API',
      emptyApifoxProjects: '暂无 APIFox 项目',
      emptyApiDomains: '暂无 API 域名',
      loadingApiDomains: '加载 API 域名中...',
      selectApiDomain: '请选择 API 域名',
      errors: {
        loadOptions: '加载导入选项失败。',
        missingApiJson: 'API 详情缺少 apiJson，无法导入。',
        unsupportedMethod: '当前数据源只支持 GET/POST，无法导入方法：',
        apifoxApiNotFound: '没有找到对应的 APIFox API。',
        apiDomainNotFound: '没有找到匹配的 API 域名，请先维护域名列表。'
      }
    }
  },
  fieldsEditor: {
    toolboxTitle: '字段编辑器',
    settingsDialogTitle: '字段设置',
    empty: '暂无字段，可以手动添加或从接口导入。',
    summary: {
      savedCount: '已设置 {count} 个字段',
      selectedCount: '已选择 {count} 个字段'
    },
    sections: {
      importApi: '导入字段',
      availableFields: '可选择字段',
      fields: '字段列表'
    },
    columns: {
      selected: '选择',
      label: '字段名称',
      variable: '变量',
      dataType: '数据类型',
      actions: '操作'
    },
    placeholders: {
      label: '请输入字段名称',
      variable: '请输入变量名',
      searchFields: '按字段名称或变量搜索'
    },
    actions: {
      settings: '设置字段',
      add: '添加字段',
      addCandidate: '添加',
      added: '已添加',
      remove: '删除',
      save: '保存',
      cancel: '取消',
      translateLabels: 'AI翻译字段名称',
      translatingLabels: '翻译中...',
      truncateVariables: '变量截取末尾',
      captureResponseFields: 'Mock抓取响应字段',
      capturingResponseFields: '正在抓取响应字段...'
    },
    help: {
      importApi: '从接口参数导入字段，或在导入接口后抓取响应字段。',
      availableFields: '从可选择字段中搜索并逐个添加需要使用的字段。'
    },
    emptySearch: '没有匹配的可选择字段。',
    validation: {
      required: '已选择字段的字段名称和变量不能为空。',
      duplicateVariable: '已选择字段的变量不能重复。',
      missingImportedApi: '请先导入接口信息。',
      translateFieldsFailed: '字段翻译失败，请稍后重试。'
    }
  },
  formItem: {
    toolboxTitle: '表单项',
    defaultLabelName: '字段',
    propertyPanelTitle: '表单项属性',
    emptyEditor: '未选择编辑器',
    properties: {
      labelName: '字段文本',
      variableName: '变量名',
      editor: '编辑器',
      layout: '布局方式'
    },
    placeholders: {
      labelName: '请输入字段文本',
      variableName: '请输入变量名'
    },
    layouts: {
      vertical: '垂直',
      horizontal: '水平'
    }
  },
  tag: {
    toolboxTitle: '标签',
    defaultTagName: '标签',
    propertyPanelTitle: '标签属性',
    properties: {
      tagName: '标签内容',
      type: '标签类型',
      size: '标签尺寸',
      color: '自定义颜色',
      colorPlaceholder: '例如：#409EFF',
      closable: '可关闭'
    },
    types: {
      default: '默认',
      primary: '主要',
      success: '成功',
      info: '信息',
      warning: '警告',
      danger: '危险'
    },
    sizes: {
      default: '默认',
      large: '大',
      medium: '中',
      small: '小'
    }
  },
  page: {
    toolboxTitle: '页面',
    backToPages: '返回页面管理',
    unnamedPage: '未命名页面',
    loading: '正在读取页面...',
    loadFailed: '页面读取失败，请稍后重试。'
  },
  appList: {
    title: 'App 列表',
    total: '共 {count} 个 App',
    createApp: '创建 App',
    loading: '正在加载 App 列表...',
    empty: '暂无 App，可以先创建一个 App。',
    loadFailed: 'App 列表加载失败，请稍后重试。',
    createFailed: 'App 创建失败，请稍后重试。',
    createSuccess: 'App 已创建。',
    updateFailed: 'App 修改失败，请稍后重试。',
    updateSuccess: 'App 已修改。',
    createDialogTitle: '创建 App',
    editDialogTitle: '编辑 App',
    appUuid: 'UUID',
    uuidHint: '必填，最多 8 个字符。',
    appAlias: 'App 名称',
    appDescription: '描述',
    saving: '保存中...',
    save: '保存',
    edit: '编辑',
    pageRange: '第 {start}-{end} 条，共 {total} 条',
    pageRangeEmpty: '暂无分页数据',
    currentPage: '第 {page} / {totalPages} 页',
    previousPage: '上一页',
    nextPage: '下一页',
    unnamedApp: '未命名 App',
    aliasRequired: 'App 名称不能为空。',
    aliasTooLong: 'App 名称不能超过 120 个字符。',
    uuidRequired: 'UUID 不能为空。',
    uuidTooLong: 'UUID 不能超过 8 个字符。',
    columns: {
      id: 'ID',
      uuid: 'UUID',
      alias: '名称',
      description: '描述',
      actions: '操作'
    }
  },
} as const;
