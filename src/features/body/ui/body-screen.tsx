import { PagedScreen } from '@/shared/ui';

import { BODY_SECTIONS } from '../model/systems';

import { BodySystem } from './body-system';

export function BodyScreen() {
  return (
    <PagedScreen
      title="Body"
      subtitle="from your band · synced 2 min ago"
      sections={BODY_SECTIONS}
      pages={BODY_SECTIONS.map((section) => (
        <BodySystem key={section.value} section={section.value} />
      ))}
    />
  );
}
