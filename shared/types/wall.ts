import type { PanelInstance } from './panel'

export interface LEDWall {
  id: string
  name: string
  xMm: number
  yMm: number
  panels: PanelInstance[]
  visible: boolean
  locked: boolean
  color?: string
}
