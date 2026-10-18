import { defineStore } from 'pinia'
import type { LEDWallProject } from '#shared/types/project'
import { useProjectStore } from './project'

const MAX_HISTORY = 80

export const useHistoryStore = defineStore('history', {
  state: () => ({
    past: [] as LEDWallProject[],
    future: [] as LEDWallProject[],
    recording: true
  }),
  getters: {
    canUndo: s => s.past.length > 0,
    canRedo: s => s.future.length > 0
  },
  actions: {
    snapshot() {
      const project = useProjectStore()
      return JSON.parse(JSON.stringify(project.exportProject())) as LEDWallProject
    },
    pushHistory() {
      if (!this.recording) return
      const snap = this.snapshot()
      const last = this.past[this.past.length - 1]
      if (last && JSON.stringify(last) === JSON.stringify(snap)) return
      this.past.push(snap)
      if (this.past.length > MAX_HISTORY) this.past.shift()
      this.future = []
    },
    undo() {
      if (!this.canUndo) return
      const project = useProjectStore()
      const current = this.snapshot()
      const previous = this.past.pop()!
      this.future.push(current)
      this.recording = false
      project.replaceProjectSnapshot(previous)
      this.recording = true
    },
    redo() {
      if (!this.canRedo) return
      const project = useProjectStore()
      const current = this.snapshot()
      const next = this.future.pop()!
      this.past.push(current)
      this.recording = false
      project.replaceProjectSnapshot(next)
      this.recording = true
    },
    reset() {
      this.past = []
      this.future = []
    },
    withTransaction(fn: () => void) {
      this.pushHistory()
      fn()
      this.pushHistory()
    }
  }
})
