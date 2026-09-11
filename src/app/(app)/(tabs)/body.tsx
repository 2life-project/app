import { BandBreathingSection, BandHeartSection, BandRecoverySection } from '@/features/band';
import { BodyScreen } from '@/features/body';

// Карточки браслета — по системам: маршрут единственный, кто видит обе фичи.
export default function Body() {
  return (
    <BodyScreen
      device={{
        heart: <BandHeartSection />,
        breathing: <BandBreathingSection />,
        recovery: <BandRecoverySection />,
      }}
    />
  );
}
