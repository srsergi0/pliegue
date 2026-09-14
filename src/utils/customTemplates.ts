import { JobTemplate } from '../constants/jobPresets';

const STORAGE_KEY = 'pliegue_custom_templates_v1';

export function loadCustomTemplates(): JobTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validación mínima para no romper si el schema cambia
    return parsed.filter(
      (t) => t && typeof t.id === 'string' && typeof t.title === 'string' && t.settings
    ) as JobTemplate[];
  } catch {
    return [];
  }
}

export function persistCustomTemplates(templates: JobTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Ignorar errores de cuota / sandbox
  }
}

export interface CustomTemplateText {
  badge?: string;
  prefix?: string;
}

export function buildCustomTemplate(
  name: string,
  settings: JobTemplate['settings'],
  text: CustomTemplateText = {}
): JobTemplate {
  const cleanName = name.trim();
  const grid = `${settings.gridCols ?? '?'}×${settings.gridRows ?? '?'}`;
  const prefix = text.prefix ?? 'Plantilla personalizada';
  return {
    id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: cleanName,
    category: 'Personalizada',
    description: `${prefix} · ${settings.sheetPreset ?? ''} · ${grid} · ${settings.layoutMode ?? ''}`,
    icon: '⭐',
    badge: text.badge ?? 'Mía',
    settings: { ...settings, excludedPageIndices: [] },
  };
}
