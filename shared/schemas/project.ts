import { z } from 'zod'
import { SCHEMA_VERSION } from '../types/project'

const rotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270)
])

export const panelDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  resolutionX: z.number().int().positive(),
  resolutionY: z.number().int().positive(),
  nominalPitchMm: z.number().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  maxPowerW: z.number().nonnegative().optional(),
  averagePowerW: z.number().nonnegative().optional(),
  pricePerPanel: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  allowedRotations: z.array(rotationSchema).min(1),
  isPreset: z.boolean().optional(),
  disclaimer: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const panelInstanceSchema = z.object({
  id: z.string().min(1),
  panelDefinitionId: z.string().min(1),
  xMm: z.number(),
  yMm: z.number(),
  rotation: rotationSchema,
  enabled: z.boolean()
})

export const ledWallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  xMm: z.number(),
  yMm: z.number(),
  panels: z.array(panelInstanceSchema),
  visible: z.boolean(),
  locked: z.boolean(),
  color: z.string().optional(),
  testPatternEnabled: z.boolean().optional(),
  testPatternKind: z.enum(['smpte', 'grid', 'cabinet', 'pitch', 'coverage']).optional(),
  panelLayoutMode: z.enum(['auto', 'manual']).optional(),
  resolutionMaskEnabled: z.boolean().optional(),
  resolutionMaskPreset: z
    .enum(['hd', 'fullHd', 'qhd', 'uhd', 'custom'])
    .optional(),
  resolutionMaskCustomWidthPx: z.number().int().positive().optional(),
  resolutionMaskCustomHeightPx: z.number().int().positive().optional(),
  resolutionMaskFitMode: z.enum(['contain', 'cover', 'oneToOne']).optional(),
  resolutionMaskOffsetLocalXMm: z.number().optional(),
  resolutionMaskOffsetLocalYMm: z.number().optional()
})

export const ledWallProjectSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string().min(1),
  name: z.string().min(1),
  walls: z.array(ledWallSchema),
  panelDefinitions: z.array(panelDefinitionSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string()
})

export function parseProjectJson(data: unknown) {
  const parsed = ledWallProjectSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error }
  }
  return { ok: true as const, data: migrateProject(parsed.data) }
}

function migrateProject(
  project: z.infer<typeof ledWallProjectSchema>
): z.infer<typeof ledWallProjectSchema> {
  if (project.schemaVersion < SCHEMA_VERSION) {
    return { ...project, schemaVersion: SCHEMA_VERSION }
  }
  return project
}

export function serializeProject(
  project: z.infer<typeof ledWallProjectSchema>
): string {
  return JSON.stringify(project, null, 2)
}
