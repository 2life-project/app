import { useState } from 'react';

import { isComplete, setBodyProfile, useBodyProfile } from '@/shared/domain';
import { Banner, Stack } from '@/shared/ui';

import { useBand } from '../model/use-band';

import { BandConnect } from './band-connect';
import { BandDashboard } from './band-dashboard';
import { BandManage } from './band-manage';
import { BodyProfileSheet } from './body-profile-sheet';

/**
 * Раздел браслета: связь, показатели, управление — в этом порядке.
 *
 * Порядок здесь и есть содержание экрана. Сверху то, ради чего человек его
 * открыл — что браслет намерил; ниже то, что задаётся один раз и потом не
 * трогается. Профиль тела стоял первым и занимал экран целиком, хотя это
 * настройка: до первого живого числа приходилось прокручивать шесть строк
 * собственного роста и веса.
 *
 * Исключение — незаполненный профиль. Пока его нет, всё, что браслет посчитал,
 * посчитано про кого-то другого, и об этом говорится сразу, одной плашкой.
 */
export function BandPanel() {
  const band = useBand();
  const profile = useBodyProfile();
  const [editingProfile, setEditingProfile] = useState(false);

  // Данные показываем, как только они есть, а не только на живой связи: они
  // лежат на диске телефона, и прятать вчерашнюю ночь за плашкой «браслет не
  // подключён» — значит терять её каждый раз, пока связь поднимается.
  const hasData = band.state.today.length > 0 || band.state.summary !== undefined;

  /**
   * Поднять связь с привязанным браслетом напрямую.
   *
   * Не поиск: идентификатор устройства телефон помнит, а сканирование эфира
   * занимает до полуминуты и выкладывает в список чужие браслеты — там, где
   * нужен ровно один, уже известный.
   */
  const reconnect = () => {
    const known = band.paired;
    if (known) void band.connect({ id: known.id, name: known.name, rssi: 0 });
    else void band.scan();
  };

  return (
    <Stack gap="md">
      {isComplete(profile) ? null : (
        <Banner
          tone="warning"
          checked={false}
          title="The band does not know your body"
          subtitle="Until you fill this in, it counts distance and calories from factory height and weight."
          action={{ label: 'Fill in', onPress: () => setEditingProfile(true) }}
        />
      )}

      {/* Профиль заполнен, но на устройство не уехал: форма закрылась со
          словом «сохранено», а браслет продолжает считать по заводским
          значениям. Молчать об этом нельзя — числа выглядят измеренными. */}
      {isComplete(profile) && band.state.profileSent === false ? (
        <Banner
          tone="warning"
          checked={false}
          title="Your body profile did not reach the band"
          subtitle="It is saved on the phone and will be sent again on the next connection. Until then the band counts by factory values."
          action={{ label: 'Send now', onPress: () => void band.saveProfile(profile) }}
        />
      ) : null}

      {/* Привязки нет — показываем подключение, даже если на диске остались
          показания: иначе после «забыть браслет» человек видел бы старые числа
          и ни одной точки входа в поиск. */}
      {!band.paired || (band.state.stage !== 'connected' && !hasData) ? (
        <BandConnect
          state={band.state}
          paired={band.paired}
          onScan={band.scan}
          onConnect={band.connect}
          onForget={band.forget}
        />
      ) : (
        <BandDashboard
          state={band.state}
          onMeasure={band.measure}
          onVibrate={band.vibrate}
          onStartRecording={band.startRecording}
          onStopRecording={band.stopRecording}
          onPull={band.pullRecordings}
          onRemoveRecording={band.removeRecording}
          onStartWorkout={band.startWorkout}
          onStopWorkout={band.stopWorkout}
          onRefresh={band.refresh}
          onReconnect={reconnect}
          onDisconnect={band.disconnect}
          onForget={band.forget}
        />
      )}

      <BandManage
        state={band.state}
        alarms={band.alarms}
        settings={band.settings}
        service={band.service}
        onFind={band.vibrate}
        onEditProfile={() => setEditingProfile(true)}
      />

      {/* Форма одна на обе точки входа — плашку сверху и строку в «Manage»:
          двумя панелями с одним содержимым они разъезжались бы на первой правке. */}
      <BodyProfileSheet
        visible={editingProfile}
        profile={profile}
        onClose={() => setEditingProfile(false)}
        onSave={(patch) => void band.saveProfile(setBodyProfile(patch))}
      />
    </Stack>
  );
}
