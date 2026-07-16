<script lang="ts">
import { i18n } from '@/i18n';

export type MChartType = 'line' | 'bar' | 'pie';

export interface MChartSeriesItem {
  name: string;
  data: number[];
}

export interface MChartProps {
  edit: boolean;
  type?: MChartType;
  xAxis?: string[];
  series?: MChartSeriesItem[];
}

function getDefaultXAxis() {
  return i18n.locale === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    : ['周一', '周二', '周三', '周四', '周五'];
}

function getDefaultSeries(): MChartSeriesItem[] {
  return [
    {
      name: i18n.t('chart.defaultSeriesName'),
      data: [120, 200, 150, 80, 70]
    }
  ];
}

function cloneSeries(series: MChartSeriesItem[]) {
  return series.map((item) => ({
    name: item.name,
    data: [...item.data]
  }));
}

function normalizeChartType(value: unknown): MChartType {
  return value === 'bar' || value === 'pie' ? value : 'line';
}

function normalizeXAxis(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return getDefaultXAxis();
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : getDefaultXAxis();
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function normalizeSeries(value: unknown): MChartSeriesItem[] {
  if (!Array.isArray(value)) {
    return getDefaultSeries();
  }

  const normalized = value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map((item, index) => {
      const data = Array.isArray(item.data)
        ? item.data.map((dataItem) => normalizeNumber(dataItem))
        : [];

      return {
        name: typeof item.name === 'string' && item.name.trim()
          ? item.name.trim()
          : `${i18n.t('chart.defaultSeriesName')}${index + 1}`,
        data
      };
    })
    .filter((item) => item.data.length > 0);

  return normalized.length ? normalized : getDefaultSeries();
}

export function normalizeChartProps(props: Partial<MChartProps>): Required<MChartProps> {
  return {
    edit: props.edit ?? false,
    type: normalizeChartType(props.type),
    xAxis: normalizeXAxis(props.xAxis),
    series: cloneSeries(normalizeSeries(props.series))
  };
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer
]);

const props = defineProps<MChartProps & {
  onChange?: (payload: MChartProps) => void;
  onToolChange?: (payload: MChartProps) => void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const chartRef = ref<HTMLElement | null>(null);
const isDarkMode = ref(false);
const normalizedProps = computed(() => normalizeChartProps(props));
const chartOption = computed(() => buildChartOption(normalizedProps.value, isDarkMode.value));

let chart: EChartsType | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;


function getAlignedData(data: number[], length: number) {
  return Array.from({ length }, (_, index) => data[index] ?? 0);
}

function getAxisTextColor(dark: boolean) {
  return dark ? '#cbd5e1' : '#475569';
}

function getAxisLineColor(dark: boolean) {
  return dark ? '#475569' : '#cbd5e1';
}

function getSplitLineColor(dark: boolean) {
  return dark ? 'rgba(71, 85, 105, 0.55)' : 'rgba(203, 213, 225, 0.72)';
}

function getPieRadius(index: number, total: number): [string, string] {
  if (total <= 1) {
    return ['0%', '68%'];
  }

  const minRadius = 18;
  const maxRadius = 72;
  const ringWidth = (maxRadius - minRadius) / total;
  const innerRadius = minRadius + index * ringWidth;
  const outerRadius = innerRadius + ringWidth * 0.78;

  return [`${Math.round(innerRadius)}%`, `${Math.round(outerRadius)}%`];
}

function buildChartOption(chartProps: Required<MChartProps>, dark: boolean): EChartsCoreOption {
  const textColor = getAxisTextColor(dark);
  const axisLineColor = getAxisLineColor(dark);
  const splitLineColor = getSplitLineColor(dark);

  if (chartProps.type === 'pie') {
    return {
      color: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'],
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: 0,
        textStyle: {
          color: textColor
        }
      },
      series: chartProps.series.map((item, index) => ({
        name: item.name,
        type: 'pie',
        radius: getPieRadius(index, chartProps.series.length),
        center: ['50%', '56%'],
        data: chartProps.xAxis.map((name, dataIndex) => ({
          name,
          value: item.data[dataIndex] ?? 0
        })),
        emphasis: {
          focus: 'self'
        }
      }))
    };
  }

  return {
    color: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'],
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      top: 0,
      textStyle: {
        color: textColor
      }
    },
    grid: {
      top: 44,
      right: 24,
      bottom: 32,
      left: 44,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartProps.xAxis,
      axisLabel: {
        color: textColor
      },
      axisLine: {
        lineStyle: {
          color: axisLineColor
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor
      },
      axisLine: {
        lineStyle: {
          color: axisLineColor
        }
      },
      splitLine: {
        lineStyle: {
          color: splitLineColor
        }
      }
    },
    series: chartProps.series.map((item) => ({
      name: item.name,
      type: chartProps.type,
      data: getAlignedData(item.data, chartProps.xAxis.length),
      smooth: chartProps.type === 'line',
      emphasis: {
        focus: 'series'
      }
    }))
  };
}

function syncDarkMode() {
  isDarkMode.value = document.documentElement.classList.contains('dark');
}

function renderChart() {
  if (!chartRef.value) return;

  if (!chart) {
    chart = echarts.init(chartRef.value, undefined, {
      renderer: 'canvas'
    });
  }

  chart.setOption(chartOption.value, true);
  chart.resize();
}

async function scheduleRenderChart() {
  await nextTick();
  renderChart();
}

onMounted(async () => {
  syncDarkMode();
  await scheduleRenderChart();

  if (chartRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      chart?.resize();
    });
    resizeObserver.observe(chartRef.value);
  }

  themeObserver = new MutationObserver(() => {
    syncDarkMode();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
});

watch(chartOption, () => {
  void scheduleRenderChart();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div
    ref="rootRef"
    class="ce-chart-tool"
    data-testid="editor-chart-tool"
  >
    <div ref="chartRef" class="ce-chart-tool__canvas" data-testid="editor-chart-canvas"></div>
  </div>
</template>

<style scoped>
.ce-chart-tool {
  width: 100%;
  color: rgb(15 23 42);
}

.ce-chart-tool__canvas {
  width: 100%;
  height: 320px;
  min-height: 240px;
}

.dark .ce-chart-tool {
  color: rgb(226 232 240);
}
</style>
