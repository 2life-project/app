import { useLocalSearchParams } from 'expo-router';

import { MeasureScreen } from '@/features/body';

export default function Measure() {
  const { subsystem } = useLocalSearchParams<{ subsystem: string }>();
  return <MeasureScreen subsystem={subsystem ?? ''} />;
}
