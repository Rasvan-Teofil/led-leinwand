<script setup lang="ts">
import type { RotationDeg } from '#shared/types/panel'
import { pitchXMm, pitchYMm } from '#shared/types/panel'
import { REFERENCE_KIND_LABELS_DE, WARNING_LABELS_DE } from '#shared/i18n/messages-de'
import type {
  ResolutionMaskFitMode,
  ResolutionMaskPresetId,
  TestPatternKind
} from '#shared/types/wall'
import { formatAreaM2De, formatIntegerDe, formatMmPairDe } from '#shared/format/de-de'
import { roundPositionMm } from '#shared/utils/position'
import { useDeleteActions } from '~/composables/useDeleteActions'
import { useProjectMetrics, useWallMetrics } from '~/composables/useWallMetrics'
import { useWallOverviewSummary } from '~/composables/useWallOverviewSummary'
import { useResolutionMask } from '~/composables/useResolutionMask'
import { RESOLUTION_MASK_PRESETS } from '#shared/calculations/resolution-mask'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { deletePanel } = useDeleteActions()
const totals = useProjectMetrics()

const patternKinds: Array<{ label: string, value: TestPatternKind }> = [
  { label: 'SMPTE-Farbbalken', value: 'smpte' },
  { label: 'Vollfläche (Gradient/Raster)', value: 'coverage' },
  { label: 'Raster & Kreuz', value: 'grid' },
  { label: 'Panel-Nummerierung', value: 'cabinet' },
  { label: 'Pixel-Pitch-Checker', value: 'pitch' }
]

const wall = computed(() =>
  project.walls.find(w => w.id === editor.primaryWallId)
)
const panel = computed(() => {
  const w = wall.value
  if (!w) return null
  return w.panels.find(p => p.id === editor.primaryPanelId) ?? null
})
const panelDef = computed(() =>
  panel.value ? project.defsById.get(panel.value.panelDefinitionId) : null
)

const metrics = useWallMetrics(() => wall.value)
const overview = useWallOverviewSummary(() => wall.value ?? null)
const resolutionMask = useResolutionMask(() => wall.value ?? null)

const maskPresetItems = [
  ...RESOLUTION_MASK_PRESETS.map(p => ({ label: p.label, value: p.id })),
  { label: 'Benutzerdefiniert', value: 'custom' as ResolutionMaskPresetId }
]

const maskFitItems: Array<{ label: string, value: ResolutionMaskFitMode }> = [
  { label: 'Einpassen (contain)', value: 'contain' },
  { label: 'Füllen (cover)', value: 'cover' },
  { label: '1:1 Pixel', value: 'oneToOne' }
]

function updateResolutionMask(
  patch: Partial<{
    enabled: boolean
    preset: ResolutionMaskPresetId
    customWidthPx: number
    customHeightPx: number
    fitMode: ResolutionMaskFitMode
  }>
) {
  if (!wall.value) return
  history.pushHistory()
  const next = {
    resolutionMaskEnabled: patch.enabled ?? wall.value.resolutionMaskEnabled,
    resolutionMaskPreset: patch.preset ?? wall.value.resolutionMaskPreset ?? 'fullHd',
    resolutionMaskCustomWidthPx:
      patch.customWidthPx ?? wall.value.resolutionMaskCustomWidthPx ?? 1920,
    resolutionMaskCustomHeightPx:
      patch.customHeightPx ?? wall.value.resolutionMaskCustomHeightPx ?? 1080,
    resolutionMaskFitMode: patch.fitMode ?? wall.value.resolutionMaskFitMode ?? 'contain'
  }
  if (patch.enabled && !wall.value.resolutionMaskEnabled) {
    Object.assign(next, {
      resolutionMaskOffsetLocalXMm: 0,
      resolutionMaskOffsetLocalYMm: 0
    })
  }
  project.updateWall(wall.value.id, next)
  history.pushHistory()
}

const wallWarnings = computed(() => {
  const m = metrics.value
  if (!m) return []
  const codes = [...m.resolution.warnings]
  if (m.overlaps.length > 0 && !codes.includes('overlapping_panels')) {
    codes.unshift('overlapping_panels')
  }
  return codes
})

function rotatePanel(deg: RotationDeg) {
  if (!wall.value || !panel.value) return
  history.pushHistory()
  project.updatePanel(wall.value.id, panel.value.id, { rotation: deg })
  history.pushHistory()
}

function onDeletePanel() {
  if (!wall.value || !panel.value) return
  deletePanel(wall.value.id, panel.value.id)
}

function onDeleteWall() {
  if (!wall.value) return
  editor.requestDeleteWall(wall.value.id)
}

function updateTestPattern(patch: { enabled?: boolean, kind?: TestPatternKind }) {
  if (!wall.value) return
  history.pushHistory()
  project.updateWall(wall.value.id, {
    testPatternEnabled: patch.enabled ?? wall.value.testPatternEnabled,
    testPatternKind: patch.kind ?? wall.value.testPatternKind ?? 'smpte'
  })
  history.pushHistory()
}

function clearSelection() {
  editor.clearSelection()
}
</script>

<template>
  <div class="space-y-3 p-3 text-sm">
    <template v-if="wall">
      <InspectorSection
        v-if="panel && panelDef"
        title="Panel-Instanz"
        :default-open="true"
      >
        <p class="text-xs text-muted">
          {{ panelDef.name }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="X (mm)">
            <UInput
              :model-value="formatIntegerDe(panel.xMm)"
              inputmode="numeric"
              @update:model-value="(v) => project.updatePanel(editor.primaryWallId!, editor.primaryPanelId!, { xMm: roundPositionMm(Number(String(v).replace(/\s/g, '').replace(',', '.'))) })"
            />
          </UFormField>
          <UFormField label="Y (mm)">
            <UInput
              :model-value="formatIntegerDe(panel.yMm)"
              inputmode="numeric"
              @update:model-value="(v) => project.updatePanel(editor.primaryWallId!, editor.primaryPanelId!, { yMm: roundPositionMm(Number(String(v).replace(/\s/g, '').replace(',', '.'))) })"
            />
          </UFormField>
        </div>
        <UFormField label="Rotation">
          <USelect
            :model-value="panel.rotation"
            :items="panelDef.allowedRotations.map((r) => ({ label: `${r}°`, value: r }))"
            @update:model-value="(v) => rotatePanel(Number(v) as RotationDeg)"
          />
        </UFormField>
        <dl class="space-y-1 text-xs text-muted">
          <div>Physikalisch: {{ formatMmPairDe(panelDef.widthMm, panelDef.heightMm) }}</div>
          <div>Pixel: {{ formatIntegerDe(panelDef.resolutionX) }}×{{ formatIntegerDe(panelDef.resolutionY) }}</div>
          <div>Pitch: {{ formatMmPairDe(pitchXMm(panelDef), pitchYMm(panelDef)) }}</div>
        </dl>
        <UButton
          color="error"
          variant="soft"
          size="sm"
          icon="i-lucide-trash-2"
          label="Panel löschen"
          data-testid="inspector-delete-panel"
          @click="onDeletePanel"
        />
      </InspectorSection>

      <InspectorSection
        title="Gesamtübersicht"
        :default-open="!panel"
      >
        <WallsWallGesamtuebersichtCard
          :summary="overview"
          compact
        />
      </InspectorSection>

      <InspectorSection
        v-if="wallWarnings.length || (metrics && metrics.overlaps.length)"
        title="Hinweise & Details"
        :default-open="wallWarnings.length > 0"
      >
        <ul
          v-if="wallWarnings.length"
          class="list-disc space-y-1 pl-4 text-xs text-warning"
        >
          <li
            v-for="(code, i) in wallWarnings"
            :key="i"
          >
            {{ WARNING_LABELS_DE[code] ?? code }}
          </li>
        </ul>
        <p
          v-if="metrics && metrics.overlaps.length"
          class="text-xs text-warning"
        >
          {{ metrics.overlaps.length }} überlappende Panel-Paare erkannt.
        </p>
        <p
          v-if="!wallWarnings.length && metrics && !metrics.overlaps.length"
          class="text-xs text-muted"
        >
          Keine Warnungen — Raster und Auflösung sind konsistent.
        </p>
      </InspectorSection>

      <InspectorSection
        v-if="metrics && metrics.resolution.valid"
        title="Standard-Auflösungen"
        :default-open="false"
      >
        <ul class="space-y-1 text-xs">
          <li
            v-for="ref in metrics.references"
            :key="ref.label"
            class="flex justify-between gap-2"
          >
            <span class="text-muted">{{ ref.label }}</span>
            <span class="text-right text-highlighted">
              {{ REFERENCE_KIND_LABELS_DE[ref.kind] ?? ref.kind }}
            </span>
          </li>
        </ul>
      </InspectorSection>

      <InspectorSection
        title="Wand-Eigenschaften"
        :default-open="!panel"
      >
        <UFormField label="Name">
          <UInput
            :model-value="wall.name"
            @update:model-value="(v) => project.updateWall(wall!.id, { name: String(v) })"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="X (mm)">
            <UInput
              :model-value="formatIntegerDe(wall.xMm)"
              inputmode="numeric"
              @update:model-value="(v) => project.updateWall(wall!.id, { xMm: roundPositionMm(Number(String(v).replace(/\s/g, '').replace(',', '.'))) })"
            />
          </UFormField>
          <UFormField label="Y (mm)">
            <UInput
              :model-value="formatIntegerDe(wall.yMm)"
              inputmode="numeric"
              @update:model-value="(v) => project.updateWall(wall!.id, { yMm: roundPositionMm(Number(String(v).replace(/\s/g, '').replace(',', '.'))) })"
            />
          </UFormField>
        </div>
        <WallsWallBuilder />
        <InspectorSection
          title="Auflösungs-Maske"
          :default-open="false"
          data-testid="resolution-mask-section"
        >
          <UCheckbox
            :model-value="wall.resolutionMaskEnabled ?? false"
            label="Maske anzeigen"
            data-testid="resolution-mask-toggle"
            @update:model-value="(v) => updateResolutionMask({ enabled: Boolean(v) })"
          />
          <template v-if="wall.resolutionMaskEnabled">
            <UFormField label="Zielauflösung">
              <USelect
                :model-value="wall.resolutionMaskPreset ?? 'fullHd'"
                :items="maskPresetItems"
                data-testid="resolution-mask-preset"
                @update:model-value="(v) => updateResolutionMask({ preset: v as ResolutionMaskPresetId })"
              />
            </UFormField>
            <div
              v-if="(wall.resolutionMaskPreset ?? 'fullHd') === 'custom'"
              class="grid grid-cols-2 gap-2"
            >
              <UFormField label="Breite (px)">
                <UInput
                  :model-value="wall.resolutionMaskCustomWidthPx ?? 1920"
                  type="number"
                  min="1"
                  @update:model-value="(v) => updateResolutionMask({ customWidthPx: Number(v) })"
                />
              </UFormField>
              <UFormField label="Höhe (px)">
                <UInput
                  :model-value="wall.resolutionMaskCustomHeightPx ?? 1080"
                  type="number"
                  min="1"
                  @update:model-value="(v) => updateResolutionMask({ customHeightPx: Number(v) })"
                />
              </UFormField>
            </div>
            <UFormField label="Einpassung">
              <USelect
                :model-value="wall.resolutionMaskFitMode ?? 'contain'"
                :items="maskFitItems"
                data-testid="resolution-mask-fit"
                @update:model-value="(v) => updateResolutionMask({ fitMode: v as ResolutionMaskFitMode })"
              />
            </UFormField>
            <dl
              v-if="resolutionMask"
              class="mt-2 space-y-1.5 text-xs"
            >
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Inhalt (LED)
                </dt>
                <dd class="text-right font-medium">
                  {{ formatIntegerDe(resolutionMask.rulerLabels.contentWidthPx) }}×{{ formatIntegerDe(resolutionMask.rulerLabels.contentHeightPx) }} px
                  · {{ formatMmPairDe(resolutionMask.rulerLabels.contentWidthMm, resolutionMask.rulerLabels.contentHeightMm) }}
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Ungenutzte LED-Pixel
                </dt>
                <dd class="text-right font-medium">
                  {{ formatIntegerDe(resolutionMask.unusedLedPixels) }}
                  ({{ resolutionMask.unusedLedPercent.toFixed(1) }} %)
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Ungenutzte Fläche
                </dt>
                <dd class="text-right font-medium">
                  {{ formatAreaM2De(resolutionMask.unusedAreaM2) }}
                </dd>
              </div>
              <div
                v-if="resolutionMask.fitMode === 'cover'"
                class="flex justify-between gap-2"
              >
                <dt class="text-muted">
                  Abgeschnittener Inhalt
                </dt>
                <dd class="text-right font-medium">
                  {{ resolutionMask.croppedContentPercent.toFixed(1) }} %
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Skalierung (Quelle → LED)
                </dt>
                <dd class="text-right font-medium">
                  ×{{ resolutionMask.scaleLedPerSource.toFixed(3) }}
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Wand-Raster
                </dt>
                <dd class="text-right font-medium">
                  {{ formatIntegerDe(resolutionMask.rulerLabels.ledWidthPx) }}×{{ formatIntegerDe(resolutionMask.rulerLabels.ledHeightPx) }} px
                </dd>
              </div>
            </dl>
            <p
              v-else
              class="text-xs text-warning"
            >
              Maske nicht berechenbar (uneinheitlicher Pitch oder keine aktiven Panels).
            </p>
            <p class="text-[10px] text-muted">
              Rahmen auf der Wand verschieben. Schattiert = Verschnitt (ungenutzte LED-Fläche).
            </p>
          </template>
        </InspectorSection>
        <UFormField label="Testbild auf Wand">
          <div class="space-y-2">
            <UCheckbox
              :model-value="wall.testPatternEnabled ?? false"
              label="Testbild anzeigen"
              data-testid="wall-testpattern-toggle"
              @update:model-value="(v) => updateTestPattern({ enabled: Boolean(v) })"
            />
            <USelect
              :model-value="wall.testPatternKind ?? 'smpte'"
              :items="patternKinds"
              :disabled="!wall.testPatternEnabled"
              @update:model-value="(v) => updateTestPattern({ kind: v as TestPatternKind })"
            />
          </div>
        </UFormField>
        <UButton
          color="error"
          variant="soft"
          size="sm"
          icon="i-lucide-trash-2"
          label="Wand löschen"
          data-testid="inspector-delete-wall"
          @click="onDeleteWall"
        />
      </InspectorSection>
    </template>

    <template v-else>
      <InspectorSection
        title="Projekt"
        :default-open="true"
      >
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between gap-2">
            <dt class="text-muted">
              Wände
            </dt>
            <dd class="font-medium">
              {{ formatIntegerDe(totals.wallCount) }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted">
              Panels (aktiv)
            </dt>
            <dd class="font-medium">
              {{ formatIntegerDe(totals.panels) }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted">
              Aktive Fläche
            </dt>
            <dd class="font-medium">
              {{ formatAreaM2De(totals.activeAreaM2) }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted">
              Pixel (Summe)
            </dt>
            <dd class="font-medium">
              {{ formatIntegerDe(totals.activePixels) }}
            </dd>
          </div>
        </dl>
        <p
          v-if="totals.incomplete"
          class="text-xs text-warning"
        >
          Summen unvollständig (fehlende Gewicht-, Leistungs- oder Preis-Daten).
        </p>
        <p class="text-xs text-muted">
          Wählen Sie links eine Wand, um Details und Eigenschaften zu bearbeiten.
        </p>
        <UButton
          size="sm"
          variant="outline"
          label="Auswahl aufheben"
          @click="clearSelection"
        />
      </InspectorSection>
    </template>
  </div>
</template>
