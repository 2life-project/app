import { BandActivitySection } from '@/features/band';
import { HomeScreen } from '@/features/home';

// Шаги и занятия браслета — в «Активности»: маршрут единственный, кто видит обе фичи.
export default function Home() {
  return <HomeScreen activityDevice={<BandActivitySection />} />;
}
