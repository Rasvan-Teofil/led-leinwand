import {
  buildProjectOverviewSummary,
  buildWallOverviewSummary
} from '#shared/calculations/wall-overview'
import type { LEDWall } from '#shared/types/wall'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

export function useWallOverviewSummary(getWall?: () => LEDWall | null | undefined) {
  const project = useProjectStore()
  const editor = useEditorStore()

  return computed(() => {
    const explicit = getWall?.()
    const wall = explicit
      ?? project.walls.find(w => w.id === editor.primaryWallId)
      ?? project.walls[0]
    if (wall) {
      return buildWallOverviewSummary(wall, project.panelDefinitions, project.defsById)
    }
    return buildProjectOverviewSummary(
      project.walls,
      project.panelDefinitions,
      project.defsById
    )
  })
}
