/**
 * Регистрация фоновой выгрузки — побочный эффект импорта этого файла.
 *
 * Её обязан подключить корень приложения. Пока она жила внутри модуля,
 * который подтягивается только вместе с экраном браслета, система будила
 * приложение ради задачи — и не находила обработчика: бандл поднимался без
 * этого экрана. Фоновая выгрузка работала лишь после того, как человек сам
 * открыл раздел, то есть ровно наоборот замыслу.
 */
import './model/background';
// Побочный эффект импорта: при выходе из аккаунта показания браслета уходят
// вместе с человеком. Регистрируется в корне по той же причине, что и выгрузка.
import './model/on-sign-out';
import { start } from './model/link';

// Связь с браслетом поднимается вместе с приложением, а не с экраном: экран
// её только показывает, а держится она и когда человек в другом разделе.
start();

export { BandPanel } from './ui/band-panel';
export { BandActivitySection } from './ui/section-activity';
export { BandBreathingSection } from './ui/section-breathing';
export { BandHeartSection } from './ui/section-heart';
export { BandRecoverySection } from './ui/section-recovery';
export { BandScreen, BandScreenOptions } from './ui/band-screen';
