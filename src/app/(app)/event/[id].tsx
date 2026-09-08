import { useLocalSearchParams } from 'expo-router';

import { EventScreen } from '@/features/journal';

export default function Event() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventScreen id={id ?? ''} />;
}
