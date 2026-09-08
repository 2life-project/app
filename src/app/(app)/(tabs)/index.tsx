import { BandPanel } from '@/features/band';
import { HomeScreen } from '@/features/home';

/**
 * Раздел браслета подключается здесь, а не внутри Главной: фича не имеет права
 * импортировать другую фичу, а собрать их вместе может только маршрут.
 *
 * Раздел временный — он существует, чтобы проверить работу с устройством на
 * живом железе.
 */
export default function Home() {
  return <HomeScreen leading={{ value: 'band', label: 'Band', page: <BandPanel /> }} />;
}
