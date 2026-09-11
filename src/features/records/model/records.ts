/** Вкладки медкарты и тексты разделов, которых на сервере нет. */
export const RECORDS_SECTIONS = [
  { value: 'labs', label: 'Labs' },
  { value: 'documents', label: 'Documents' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'genetics', label: 'Genetics' },
  { value: 'vaccines', label: 'Vaccines' },
] as const;

export type RecordsSection = (typeof RECORDS_SECTIONS)[number]['value'];

/**
 * Разделов нет на сервере. Пустое место молчит, а придуманный список аллергий
 * в медицинской карте — это уже не макет, а неверные данные о человеке.
 */
export const NOT_ON_SERVER = {
  allergies: {
    title: 'Allergies are not kept here yet',
    text: 'The backend has no place for them. Until it does, tell your doctor directly — a list we invented would be worse than none.',
  },
  vaccines: {
    title: 'Vaccines are not kept here yet',
    text: 'Nothing on the backend stores them. Upload the certificate as a document — it will at least live in the card.',
  },
} as const;

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
