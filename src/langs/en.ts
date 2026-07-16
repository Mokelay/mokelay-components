export const enMessages = {
  app: {
    title: 'Mokelay Editor',
    subtitle: 'Mokelay page configurator',
    darkMode: 'Dark mode',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    home: 'Home',
    apps: 'Apps',
    datasources: 'Datasources',
    pageList: 'Pages',
    chinese: '中文',
    english: 'English'
  },
  editor: {
    placeholder: 'Start typing your content...',
    defaultParagraph: 'Welcome to the Mokelay editor starter template.',
    fullscreenEdit: 'Fullscreen',
    saveContent: 'Save',
    saving: 'Saving...',
    saveSuccess: 'Saved',
    saveFailed: 'Save failed. Please try again.',
    previewPage: 'Preview',
    properties: 'Properties',
    propertyDialogTitle: 'Property Settings',
    configJson: 'Config JSON',
    close: 'Close',
    invalidJson: 'Enter valid JSON.',
    events: {
      menu: 'Events',
      title: 'Event Settings',
      add: 'Add event',
      remove: 'Remove event',
      empty: 'No events yet.',
      fields: {
        event: 'Trigger event',
        actions: 'Action config'
      }
    }
  },
  preview: {
    title: 'Config Preview',
    backToEditor: 'Back',
    emptyState: 'No page content yet.',
    modes: {
      pc: 'PC',
      h5: 'H5',
      ios: 'IOS',
      android: 'Android'
    },
    qrCodeAlt: 'Preview QR code',
    qrCodeLoading: 'Generating QR code...',
    qrCodeFailed: 'Failed to generate QR code. Please try again later.',
    qrCodeUnavailable: 'Save the page before generating an iOS preview QR code.',
    qrCodePlaceholder: 'This is a temporary QR code and will be replaced when mobile preview is live.',
    iosQrCode: 'IOS preview QR code',
    androidQrCode: 'Android preview QR code',
    iosQrCodeDescription: 'Scan with the Mokelay iOS app to open the current preview page.',
    androidQrCodeDescription: 'This is a temporary QR code and will be replaced when Android preview is live.'
  },
  pageState: {
    keyCount: '{count} fields',
    readonly: 'Read only',
    errors: {
      readonly: 'Page state is read only and cannot be changed.',
      invalidPath: 'The state path is invalid.',
      pathRequired: 'A state path is required.',
      invalidValue: 'The state value must be JSON serializable.',
      objectRequired: 'The root state value must be a JSON object.'
    }
  },
  notFound: {
    title: 'Page not found',
    description: 'No renderable Mokelay page DSL was found. Check the URL or return home.',
    home: 'Back home'
  },
  globalCalls: {
    ok: 'OK',
    cancel: 'Cancel',
    alertRoleLabel: 'Alert',
    confirmRoleLabel: 'Confirm',
    messageRoleLabel: 'Message'
  },
  variableValue: {
    modeLabel: 'Variable editing mode',
    modes: {
      input: 'Constant',
      variable: 'Variable',
      flow: 'Advanced'
    },
    previous: 'Previous config',
    validation: {
      invalidJson: 'Enter valid JSON, or use a variable value.',
      invalidArray: 'Enter a valid JSON array, or use a variable value.',
      invalidObject: 'Enter a valid JSON object, or use a variable value.',
      invalidNumber: 'Enter a valid number, or use a variable value.',
      invalidBoolean: 'Enter true or false, or use a variable value.'
    },
    actions: {
      insert: 'Insert variable'
    },
    insert: {
      title: 'Insert variable',
      search: 'Search variables',
      empty: 'No variables available'
    },
    variable: {
      placeholder: 'Select variable',
      blockPlaceholder: 'Select block',
      fieldPlaceholder: 'Select data',
      emptySources: 'No readable block data',
      missingBlock: 'Missing block {blockId}',
      missingPage: 'Missing page {pageId}',
      currentPage: 'Current page',
      dialogPage: 'Dialog page',
      legacySource: 'Legacy variables',
      variable: 'Variable',
      configureProcessors: 'Configure processors'
    },
    flow: {
      title: 'Advanced variable flow',
      subtitle: 'Compose the final value with variables, processors, and if-else nodes.',
      library: 'Nodes',
      inspector: 'Node properties',
      noSelection: 'Select a node.',
      open: 'Open canvas',
      summary: 'Flow',
      nodes: {
        variable: 'Variable',
        constant: 'Constant',
        processor: 'Processor',
        if: 'if-else',
        output: 'Output'
      },
      fields: {
        value: 'Value',
        left: 'Left value',
        operator: 'Operator',
        right: 'Right value'
      },
      validation: {
        singleOutput: 'Advanced flow can only have one output node.'
      }
    }
  },
  input: {
    toolboxTitle: 'Input',
    defaultPlaceholder: 'Please enter...',
    propertyPanelTitle: 'Input Properties',
    properties: {
      placeholder: 'Placeholder',
      value: 'Default value',
      valuePlaceholder: 'Please enter a default value'
    }
  },
  link: {
    toolboxTitle: 'Link',
    defaultText: 'Link',
    defaultUrl: 'https://mokelay.com',
    propertyPanelTitle: 'Link Properties',
    properties: {
      text: 'Link text',
      url: 'Link URL',
      open: 'Open in new page'
    }
  },
  advanceInput: {
    toolboxTitle: 'Advanced Input'
  },
  dividerLine: {
    toolboxTitle: 'Divider'
  },
  chart: {
    toolboxTitle: 'Chart',
    propertyPanelTitle: 'Chart Properties',
    defaultSeriesName: 'Data',
    types: {
      line: 'Line chart',
      bar: 'Bar chart',
      pie: 'Pie chart'
    },
    properties: {
      type: 'Chart type',
      xAxis: 'X-axis data',
      series: 'Series data'
    },
    dataEditor: {
      title: 'Chart Data Settings',
      summary: '{categories} categories, {series} series',
      categoryPrefix: 'Category ',
      sections: {
        grid: 'Data grid',
        preview: 'Preview'
      },
      help: {
        grid: 'Edit categories and series values. Saved data keeps every series aligned to the category count.'
      },
      columns: {
        series: 'Series',
        actions: 'Actions'
      },
      actions: {
        settings: 'Edit chart data',
        addCategory: 'Add category',
        addSeries: 'Add series',
        remove: 'Remove',
        removeShort: 'Del'
      },
      validation: {
        emptyCategory: 'Keep at least one non-empty category.',
        emptySeries: 'Keep at least one series.',
        emptySeriesName: 'Series name is required.',
        invalidNumber: 'Every data cell must be a valid number.'
      }
    },
    validation: {
      invalidJson: 'Enter valid JSON.'
    }
  },
  tabs: {
    toolboxTitle: 'Tabs',
    propertyPanelTitle: 'Tabs Properties',
    properties: {
      tabs: 'Tabs config',
      activeTabId: 'Active tab ID'
    },
    dataFields: {
      activeTabId: 'Active tab ID',
      activeTab: 'Active tab',
      tabs: 'Tabs'
    },
    states: {
      empty: 'Configure tabs first.',
      loading: 'Loading page...',
      loadFailed: 'Failed to load page.',
      emptyPage: 'The active tab has no page content.'
    },
    configEditor: {
      title: 'Tabs Config',
      defaultTabName: 'Tab {index}',
      empty: 'No tabs yet. Add a tab to start.',
      loadingPages: 'Loading pages...',
      pageOptionsLoadFailed: 'Failed to load page options. You can still enter pageUUID manually.',
      summary: {
        savedCount: '{count} tabs configured · Default: {active}',
        noActive: 'Not set'
      },
      sources: {
        user: 'User page',
        system: 'System page'
      },
      columns: {
        active: 'Default',
        id: 'ID',
        name: 'Name',
        source: 'Source',
        pageUUID: 'Page UUID',
        actions: 'Actions'
      },
      actions: {
        settings: 'Edit tabs config',
        add: 'Add tab',
        refreshPages: 'Refresh pages',
        clear: 'Clear config',
        remove: 'Remove'
      },
      validation: {
        invalid: 'Tabs config is invalid.',
        emptyId: 'Tab ID is required.',
        duplicateId: 'Tab ID must be unique: {id}',
        emptyName: 'Tab name is required.',
        emptyPageUUID: 'Page UUID is required.',
        invalidActive: 'The default active tab must exist in the tab list.'
      }
    },
    validation: {
      invalidTabsJson: 'Enter valid tabs JSON.'
    }
  },
  editorSelector: {
    toolboxTitle: 'Component Selector',
    placeholder: 'Select a component'
  },
  form: {
    toolboxTitle: 'Form',
    propertyPanelTitle: 'Form Properties',
    placeholder: 'Add a form item',
    properties: {
      layout: 'Layout',
      items: 'Form item settings',
      actionBar: 'Action bar settings'
    },
    layouts: {
      vertical: 'Vertical',
      horizontal: 'Horizontal'
    },
    actionBarEditor: {
      settingsDialogTitle: 'Action toolbar settings',
      empty: 'No buttons yet. Add a button first.',
      summary: {
        savedCount: '{count} buttons configured',
        draftCount: '{count} buttons now'
      },
      sections: {
        layout: 'Toolbar layout',
        buttons: 'Button settings'
      },
      help: {
        layout: 'Configure toolbar button alignment, size, and display mode.'
      },
      fields: {
        align: 'Align',
        size: 'Size',
        mode: 'Mode',
        id: 'Button ID',
        label: 'Button label',
        variant: 'Variant',
        disabled: 'Disabled'
      },
      align: {
        left: 'Left',
        right: 'Right',
        spaceBetween: 'Space between'
      },
      size: {
        small: 'Small',
        medium: 'Medium',
        large: 'Large'
      },
      mode: {
        inline: 'Inline',
        grouped: 'Grouped',
        dropdown: 'Dropdown'
      },
      variant: {
        primary: 'Primary',
        secondary: 'Secondary',
        ghost: 'Ghost',
        danger: 'Danger',
        warning: 'Warning',
        text: 'Text'
      },
      actions: {
        settings: 'Set toolbar',
        add: 'Add button',
        save: 'Save',
        cancel: 'Cancel',
        moveUp: 'Move up',
        moveDown: 'Move down',
        remove: 'Remove'
      }
    },
    itemsEditor: {
      settingsDialogTitle: 'Form item settings',
      empty: 'No form items yet. Set fields first.',
      summary: {
        savedCount: '{count} form items configured',
        draftCount: '{count} form items now'
      },
      sections: {
        fields: 'Bulk import fields',
        items: 'Form item settings'
      },
      columns: {
        label: 'Field label',
        variable: 'Variable name',
        layout: 'Layout',
        editor: 'Component type',
        actions: 'Actions'
      },
      placeholders: {
        label: 'Enter field label',
        variable: 'Enter variable name'
      },
      actions: {
        settings: 'Set form items',
        save: 'Save',
        cancel: 'Cancel',
        moveUp: 'Move up',
        moveDown: 'Move down',
        remove: 'Remove'
      },
      help: {
        fields: 'Use the fields editor to bulk import fields. Saving fields will create or remove form items.'
      }
    }
  },
  advanceTable: {
    toolboxTitle: 'Advanced Table',
    propertyPanelTitle: 'Advanced Table Properties',
    defaultColumnName: 'Column',
    empty: 'No data',
    noColumns: 'Set table columns first',
    noDatasource: 'No datasource',
    loading: 'Loading data...',
    loadFailed: 'Failed to load datasource',
    missingMatchedField: 'Match the list data field first',
    invalidMatchedData: 'The list data field must be an array of objects',
    selectAll: 'Select all',
    selectRow: 'Select row',
    properties: {
      index: 'Show index column',
      selection: 'Show selection column',
      showPageBreak: 'Show pagination',
      columns: 'Columns',
      data: 'Datasource',
      ds: 'Datasource'
    },
    pagination: {
      label: 'Pagination',
      summary: '{start}-{end} of {total} · Page {page} / {totalPages}',
      previous: 'Previous',
      next: 'Next'
    },
    columnsEditor: {
      settingsDialogTitle: 'Advanced table column settings',
      empty: 'No columns yet. Set fields first.',
      customContent: 'Custom cell content will be preserved.',
      summary: {
        savedCount: '{count} columns configured',
        draftCount: '{count} columns now'
      },
      sections: {
        fields: 'Bulk import fields',
        columns: 'Column settings'
      },
      columns: {
        name: 'Column name',
        variable: 'Field variable',
        width: 'Width',
        fixed: 'Fixed',
        template: 'Text template',
        actions: 'Actions'
      },
      placeholders: {
        name: 'Enter column name',
        variable: 'Enter field variable',
        width: 'Auto',
        template: 'Example: {{name}}'
      },
      fixed: {
        none: 'Not fixed',
        left: 'Fixed left',
        right: 'Fixed right'
      },
      actions: {
        settings: 'Set columns',
        save: 'Save',
        cancel: 'Cancel',
        moveUp: 'Move up',
        moveDown: 'Move down',
        resetTemplate: 'Reset template',
        remove: 'Remove'
      },
      help: {
        fields: 'Use the fields editor to bulk import fields. Saving fields will create or remove table columns.'
      }
    },
    datasourceFields: {
      data: 'List data',
      page: 'Page',
      pageSize: 'Page size',
      total: 'Total',
      search: 'Search'
    },
    defaultRows: {
      first: {
        name: 'Mokelay Page',
        status: 'Designing',
        tag: 'Design',
        owner: 'Product Team',
        linkText: 'Website',
        linkUrl: 'https://mokelay.com'
      },
      second: {
        name: 'Advanced Table',
        status: 'Previewable',
        tag: 'Preview',
        owner: 'Editor Team',
        linkText: 'Docs',
        linkUrl: 'https://editor.mokelay.com'
      }
    }
  },
  datasource: {
    toolboxTitle: 'Datasource Editor',
    title: 'Datasource',
    settingsDialogTitle: 'Datasource settings',
    empty: 'No items',
    emptySchema: 'No field config yet. Select the Schema from a response example first.',
    emptySelectedFields: 'No fields selected.',
    noSelectableFields: 'This schema does not contain selectable fields.',
    noFieldsMatchingPath: 'No fields match this path.',
    summary: {
      domain: 'Domain',
      path: 'Path',
      method: 'Method',
      emptyDomain: 'No domain selected',
      emptyPath: 'No path set',
      emptyMethod: 'No method set'
    },
    fields: {
      domain: 'API domain',
      path: 'API path',
      method: 'Method',
      importSource: 'Import source',
      apiSource: 'API source',
      mokelayApi: 'Mokelay API',
      apifoxProject: 'APIFox project',
      apifoxApiId: 'API ID',
      key: 'Key',
      value: 'Value',
      mock: 'Mock data',
      jsonSchema: 'JSON Schema',
      responseExample: 'Response example',
      responseExampleInput: 'JSON input',
      responseExamplePreview: 'Tree preview',
      responseExamplePreviewEmpty: 'Enter valid JSON to preview its tree structure',
      responseExamplePlaceholder: 'Enter a valid JSON response example',
      generatedFields: 'Fields',
      dataType: 'Data type',
      allDataTypes: 'All data types',
      pathDepth: 'Path depth',
      fieldPath: 'Field path',
      searchFieldsByPath: 'Search by field path',
      selectedFields: 'Selected fields',
      availableFields: 'Available fields',
      required: 'Required'
    },
    sections: {
      headers: 'Header',
      queries: 'Query',
      body: 'Body',
      importApi: 'Import API info',
      requestConfig: 'Request configuration',
      responseConfig: 'Response configuration',
      fieldSelection: 'Field selection',
      externalFieldMatching: 'External field matching'
    },
    actions: {
      add: 'Add',
      added: 'Added',
      remove: 'Remove',
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      settings: 'Datasource settings',
      importApi: 'Import',
      importingApi: 'Importing...',
      addResponseExample: 'Add response data',
      cancel: 'Cancel',
      capture: 'Capture',
      captureResponseExample: 'Mock response example',
      capturingResponseExample: 'Capturing response example...',
      selectSchema: 'Select this Schema',
      translateFields: 'Translate to Chinese',
      translatingFields: 'Translating...',
      previewField: 'Preview',
      fullSchema: 'Full Schema'
    },
    responseMock: {
      title: 'Configure request mock data',
      help: 'Enter temporary mock data for this capture. It will not overwrite the values in the request configuration.'
    },
    help: {
      responseConfig: 'Capture or edit response examples, then select one to generate the field configuration.',
      fieldSelection: 'Add the fields that components should use from the available fields.',
      externalFieldMatching: 'Match the external fields required by the component to selected fields.'
    },
    matching: {
      empty: 'No external fields.',
      unmatched: 'Unmatched',
      unmatchedCount: '{count} fields unmatched'
    },
    schemaTypes: {
      object: 'Object',
      array: 'List',
      string: 'Text',
      number: 'Number',
      boolean: 'Switch',
      null: 'Empty',
      union: 'Union'
    },
    componentHints: {
      text: 'Text',
      number: 'Number',
      switch: 'Switch',
      object: 'Object',
      array: 'List'
    },
    processors: {
      dialogTitle: 'Field processors',
      add: 'Add processor',
      apply: 'Apply',
      configure: 'Configure processors',
      view: 'View processors',
      count: '{count} processors',
      empty: 'No processors configured.',
      up: 'Move up',
      down: 'Move down',
      unsupported: 'This processor is not recognized. Its config is preserved and can be removed.',
      incompatible: 'This processor is incompatible with the current field type. Its config is preserved and can be removed.',
      preview: {
        title: 'Field data preview',
        example: 'Response example',
        unavailable: 'Unavailable',
        noExamples: 'No valid response examples. Add or fix response data first.',
        finalValue: 'Final rendered data',
        finalValueHelp: 'The data the component receives after path extraction and Processor execution.',
        extractedValue: 'Data before Processors',
        extractedValueHelp: 'The data extracted from the response example using the field path.',
        pathNotFound: 'This field path does not exist in the selected response example.',
        invalidPath: 'The field path is invalid and cannot be previewed.',
        invalidResult: 'A Processor returned non-JSON data that cannot be displayed.',
        unsupportedProcessor: 'The field contains an unsupported Processor and cannot be previewed.',
        invalidProcessor: 'The Processor configuration is invalid and cannot be previewed.',
        failed: 'Could not preview the field data.'
      },
      trim: {
        title: 'Trim whitespace',
        description: 'Trims leading and trailing whitespace from strings and leaves other values unchanged.'
      },
      aiDslRequestContext: {
        title: 'Build AI DSL request context',
        description: 'Combines request JSON with recent successful turns into an AI DSL generation payload.',
        fields: {
          history: 'Conversation history (JSON array or template)',
          historyOrder: 'Conversation history order',
          historyLimit: 'Recent turn limit',
          includeHistoryInRequirement: 'Include history summary in requirement',
          includeHistoryInDslContext: 'Include history summary in DSL context'
        },
        historyOrders: {
          newestFirst: 'Newest to oldest',
          oldestFirst: 'Oldest to newest'
        },
        errors: {
          invalidHistory: 'Enter valid JSON.',
          invalidLimit: 'The history limit must be a number greater than or equal to 0.'
        }
      },
      mergeData: {
        title: 'Merge data',
        description: 'Shallow-merges fields into an object or each list item.',
        fields: { data: 'Fields to merge (JSON object)' }
      },
      filter: {
        title: 'Filter list',
        description: 'Filters list data by conditions.',
        addCondition: 'Add condition',
        empty: 'With no conditions, all list items are retained.',
        fields: {
          type: 'Condition relation',
          variable: 'Field path',
          condition: 'Condition',
          value: 'Comparison value (JSON)'
        },
        conditions: {
          eq: 'Equals',
          gt: 'Greater than',
          lt: 'Less than',
          is_empty: 'Is empty',
          is_not_empty: 'Is not empty'
        }
      },
      dateTimeFormat: {
        title: 'Format date and time',
        description: 'Formats date and time values in the browser local time zone.',
        custom: 'Custom',
        fields: { preset: 'Preset', format: 'Format' }
      },
      randomId: {
        title: 'Random ID',
        description: 'Generates a short random string for empty values and can preserve non-empty strings.',
        fields: {
          prefix: 'Prefix',
          length: 'Length',
          alphabet: 'Alphabet',
          lowerCase: 'Lowercase',
          when: 'When'
        },
        when: {
          empty: 'Only when empty',
          always: 'Always generate'
        }
      },
      validation: {
        required: 'This field is required.',
        jsonObject: 'Enter a valid JSON object.'
      }
    },
    validation: {
      invalidJsonSchema: 'Enter a JSON Schema that matches the supported format.',
      invalidNumber: 'Enter a valid number.',
      invalidObject: 'Enter a valid JSON object.',
      invalidArray: 'Enter a valid JSON array.',
      invalidResponseExample: 'Enter a valid JSON response example.',
      missingResponseExample: 'Enter a response example first.',
      missingFile: 'Choose a file in Body.',
      fixBodyBeforeSchema: 'Fix Body mock data before parsing JSON Schema.',
      fixMockBeforeCapture: 'Fix the request mock data first.',
      nonJsonResponse: 'The API response is not JSON.',
      invalidJsonResponse: 'The API response is not valid JSON.',
      apiRequestFailed: 'API request failed:',
      missingApiDomain: 'Choose an API domain.',
      apiDomainNotFound: 'Could not find the API domain.',
      invalidApiDomainList: 'The API domain list is invalid.',
      emptyArraySchema: 'Cannot infer JSON Schema from an empty array.',
      mixedArraySchema: 'The array contains incompatible types, so JSON Schema cannot be inferred.',
      translateFieldsFailed: 'Could not translate the fields. Try again later.'
    },
    import: {
      apiSources: {
        user: 'User-created APIs',
        system: 'System APIs'
      },
      sources: {
        mokelay: 'Mokelay orchestration API',
        apifox: 'APIFox API'
      },
      placeholders: {
        apifoxApiId: 'Enter API ID'
      },
      emptyMokelayApis: 'No Mokelay APIs',
      emptyApifoxProjects: 'No APIFox projects',
      emptyApiDomains: 'No API domains',
      loadingApiDomains: 'Loading API domains...',
      selectApiDomain: 'Choose API domain',
      errors: {
        loadOptions: 'Failed to load import options.',
        missingApiJson: 'The API detail is missing apiJson and cannot be imported.',
        unsupportedMethod: 'The datasource only supports GET/POST. Cannot import method:',
        apifoxApiNotFound: 'Could not find the APIFox API.',
        apiDomainNotFound: 'No matching API domain was found. Add it to the domain list first.'
      }
    }
  },
  fieldsEditor: {
    toolboxTitle: 'Fields Editor',
    settingsDialogTitle: 'Field settings',
    empty: 'No fields yet. Add fields manually or import them from an API.',
    summary: {
      savedCount: '{count} fields configured',
      selectedCount: '{count} fields selected'
    },
    sections: {
      importApi: 'Import fields',
      availableFields: 'Available fields',
      fields: 'Field list'
    },
    columns: {
      selected: 'Select',
      label: 'Field name',
      variable: 'Variable',
      dataType: 'Data type',
      actions: 'Actions'
    },
    placeholders: {
      label: 'Enter field name',
      variable: 'Enter variable name',
      searchFields: 'Search by field name or variable'
    },
    actions: {
      settings: 'Set fields',
      add: 'Add field',
      addCandidate: 'Add',
      added: 'Added',
      remove: 'Remove',
      save: 'Save',
      cancel: 'Cancel',
      translateLabels: 'AI translate field names',
      translatingLabels: 'Translating...',
      truncateVariables: 'Keep variable tail',
      captureResponseFields: 'Mock response fields',
      capturingResponseFields: 'Capturing response fields...'
    },
    help: {
      importApi: 'Import fields from request parameters, or capture response fields after importing an API.',
      availableFields: 'Search available fields and add only the fields needed by the component.'
    },
    emptySearch: 'No available fields match the search.',
    validation: {
      required: 'Selected fields must include both field name and variable.',
      duplicateVariable: 'Selected field variables must be unique.',
      missingImportedApi: 'Import API information first.',
      translateFieldsFailed: 'Could not translate the fields. Try again later.'
    }
  },
  formItem: {
    toolboxTitle: 'Form Item',
    defaultLabelName: 'Field',
    propertyPanelTitle: 'Form Item Properties',
    emptyEditor: 'No editor selected',
    properties: {
      labelName: 'Field label',
      variableName: 'Variable name',
      editor: 'Editor',
      layout: 'Layout'
    },
    placeholders: {
      labelName: 'Enter field label',
      variableName: 'Enter variable name'
    },
    layouts: {
      vertical: 'Vertical',
      horizontal: 'Horizontal'
    }
  },
  tag: {
    toolboxTitle: 'Tag',
    defaultTagName: 'Tag',
    propertyPanelTitle: 'Tag Properties',
    properties: {
      tagName: 'Tag name',
      type: 'Type',
      size: 'Size',
      color: 'Custom color',
      colorPlaceholder: 'e.g. #409EFF',
      closable: 'Closable'
    },
    types: {
      default: 'Default',
      primary: 'Primary',
      success: 'Success',
      info: 'Info',
      warning: 'Warning',
      danger: 'Danger'
    },
    sizes: {
      default: 'Default',
      large: 'Large',
      medium: 'Medium',
      small: 'Small'
    }
  },
  page: {
    toolboxTitle: 'Page',
    backToPages: 'Back to pages',
    unnamedPage: 'Untitled page',
    loading: 'Loading page...',
    loadFailed: 'Failed to load page. Please try again.'
  },
  appList: {
    title: 'Apps',
    total: '{count} apps',
    createApp: 'Create app',
    loading: 'Loading apps...',
    empty: 'No apps yet. Create one to get started.',
    loadFailed: 'Failed to load apps. Please try again.',
    createFailed: 'Failed to create app. Please try again.',
    createSuccess: 'App created.',
    updateFailed: 'Failed to update app. Please try again.',
    updateSuccess: 'App updated.',
    createDialogTitle: 'Create app',
    editDialogTitle: 'Edit app',
    appUuid: 'UUID',
    uuidHint: 'Required, up to 8 characters.',
    appAlias: 'App name',
    appDescription: 'Description',
    saving: 'Saving...',
    save: 'Save',
    edit: 'Edit',
    pageRange: '{start}-{end} of {total}',
    pageRangeEmpty: 'No paginated data',
    currentPage: 'Page {page} / {totalPages}',
    previousPage: 'Previous',
    nextPage: 'Next',
    unnamedApp: 'Untitled app',
    aliasRequired: 'App name is required.',
    aliasTooLong: 'App name cannot exceed 120 characters.',
    uuidRequired: 'UUID is required.',
    uuidTooLong: 'UUID cannot exceed 8 characters.',
    columns: {
      id: 'ID',
      uuid: 'UUID',
      alias: 'Name',
      description: 'Description',
      actions: 'Actions'
    }
  },
} as const;
