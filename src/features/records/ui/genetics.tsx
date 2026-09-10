import { useQuery } from '@/core/http/use-query';
import { dayOf, shortDay } from '@/shared/lib/day';
import { Card, EmptyPanel, ListRow, Stack, Tag, Text, WidgetCard } from '@/shared/ui';

import { fetchGeneticsReport, fetchGeneticsSummary } from '../api/records';
import { latestParsed, sectionTitle } from '../model/genetics';

/**
 * Генетика: последняя разобранная загрузка и отчёт по темам. Оценки и
 * выводы — серверные; клиент не решает, хорош ли генотип.
 */
export function Genetics() {
  const summary = useQuery('genetics', (signal) => fetchGeneticsSummary(signal));
  const uploads = summary.data?.uploads ?? [];
  const upload = latestParsed(uploads);
  const report = useQuery(upload ? `genetics:${upload.id}` : null, (signal) =>
    fetchGeneticsReport(upload?.id ?? '', signal),
  );

  if (!summary.data) {
    return (
      <Card variant="sunken">
        <Text tone="muted">{summary.loading ? 'Loading…' : 'Genetics did not load.'}</Text>
      </Card>
    );
  }

  if (!upload) {
    return (
      <EmptyPanel
        icon="inbox"
        title={uploads.length === 0 ? 'No genetic report yet' : 'The report is still being parsed'}
        text="Upload the raw data file in the web app — the report is built from it."
      />
    );
  }

  const data = report.data;

  return (
    <Stack gap="md">
      <Card>
        <ListRow
          title={upload.originalFilename}
          subtitle={`${upload.sourceFormat} · parsed ${shortDay(dayOf(upload.parsedAt ?? upload.uploadedAt))}`}
          trailing={data ? `${data.foundSnps} of ${data.totalSnps}` : undefined}
          trailingCaption={data ? 'markers found' : undefined}
        />
      </Card>

      {data ? (
        <WidgetCard title="Overall" caption={String(Math.round(data.overallScore))}>
          <Stack direction="row" gap="sm" wrap>
            <Tag label={`${data.greenCount} GOOD`} tone="success" dot />
            <Tag label={`${data.yellowCount} MIXED`} tone="warning" dot />
            <Tag label={`${data.redCount} CONCERN`} tone="danger" dot />
          </Stack>
        </WidgetCard>
      ) : (
        <Card variant="sunken">
          <Text tone="muted">
            {report.loading ? 'Building the report…' : 'The report did not load.'}
          </Text>
        </Card>
      )}

      {data?.sections.map((section) => (
        <WidgetCard
          key={section.id}
          title={sectionTitle(section.id)}
          caption={section.sectionLevel}>
          <Stack gap="sm">
            {section.insight ? <Text>{section.insight.headline}</Text> : null}
            {section.panels.map((panel) => (
              <ListRow
                key={panel.id}
                title={sectionTitle(panel.id)}
                subtitle={panel.subtitle ?? panel.intro}
                trailing={panel.compositeLevel}
                trailingCaption={`${panel.totalFound} found`}
              />
            ))}
          </Stack>
        </WidgetCard>
      ))}
    </Stack>
  );
}
