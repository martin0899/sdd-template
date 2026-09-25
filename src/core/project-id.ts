export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function today(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export function generateProjectId(projectName: string, date?: string): string {
  const d = date || today();
  return `proy-${d}-${slugify(projectName)}`;
}