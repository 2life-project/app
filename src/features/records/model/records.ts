/** Медкарта — содержимое из макета. */
export const RECORDS_SECTIONS = [
  { value: 'labs', label: 'Labs' },
  { value: 'documents', label: 'Documents' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'genetics', label: 'Genetics' },
  { value: 'vaccines', label: 'Vaccines' },
] as const;

export type RecordsSection = (typeof RECORDS_SECTIONS)[number]['value'];

export const OUT_OF_RANGE = [
  { label: 'APOB', value: '1.24', unit: 'g/L', note: 'above target', noteTone: 'danger' },
  { label: 'LDL', value: '3.64', unit: 'mmol/L', note: 'at the edge', noteTone: 'warning' },
  { label: 'VITAMIN D', value: '28', unit: 'ng/mL', note: 'target 40–60', noteTone: 'warning' },
  { label: 'OMEGA-3', value: '6.1', unit: '%', note: 'improving', noteTone: 'warning' },
] as const;

export const DOCUMENTS = [
  { id: 'panel', title: 'Blood panel · 18 markers', subtitle: 'Jul 2, 2026 · recognized' },
  { id: 'inbody', title: 'InBody 770', subtitle: 'Jul 12, 2026 · recognized' },
  { id: 'apoe', title: 'Genetics · APOE', subtitle: 'Mar 4, 2026 · recognized' },
  { id: 'thyroid', title: 'Ultrasound · thyroid', subtitle: 'being recognized…' },
] as const;

export const ALLERGIES = [
  { id: 'penicillin', title: 'Penicillin', severity: 'SEVERE', tone: 'danger' },
  { id: 'birch', title: 'Birch pollen', severity: 'MODERATE', tone: 'warning' },
  { id: 'lactose', title: 'Lactose', severity: 'MILD', tone: 'success' },
] as const;

export const GENETICS = [
  { id: 'apoe', title: 'APOE ε3/ε4', subtitle: 'lipid handling · one risk allele' },
  { id: 'mthfr', title: 'MTHFR C677T', subtitle: 'folate metabolism · heterozygous' },
  { id: 'vdr', title: 'VDR Taq1', subtitle: 'vitamin D receptor · typical' },
] as const;

export const VACCINES = [
  { id: 'flu', title: 'Influenza', subtitle: 'Oct 12, 2025 · yearly' },
  { id: 'tetanus', title: 'Tetanus', subtitle: 'Apr 3, 2019 · due 2029' },
  { id: 'hepb', title: 'Hepatitis B', subtitle: 'course complete' },
] as const;

export const WHY_RECORDS =
  'Everything a doctor asks for in the first minute — allergies, last panel, documents — in one place you can open in the room.';

/** Медкарта до первого документа: с чего она начинается. Текст из макета. */
export const RECORDS_INTRO = {
  title: 'Medical card',
  subtitle: 'empty for now',
  search: 'Search starts working after the first document',
  empty: {
    title: 'No documents yet',
    text: 'Upload your first lab panel, conclusion or ultrasound — and the card starts collecting metrics, risks and history.',
  },
  action: 'Upload — in the web version',
} as const;
