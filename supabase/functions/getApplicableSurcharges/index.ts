import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

function parseTimeToMinutes(timeStr: string | null) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json().catch(() => ({}));
    const now = body.datetime ? new Date(body.datetime) : new Date();
    const professionId = body.profession_id || null;

    const brOffset = -3 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + brOffset;
    const brHour = ((utcMinutes / 60) % 24 + 24) % 24;
    const brMinutes = ((utcMinutes % 60) + 60) % 60;
    const brTimeMinutes = Math.floor(brHour) * 60 + brMinutes;
    const brDay = now.getUTCDay();

    const supabase = getServiceClient();
    const { data: allRules, error } = await supabase
      .from('surcharge_rules')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const applicable = [];

    for (const rule of allRules ?? []) {
      if (!rule.applies_to_all_services && professionId) {
        if (!rule.profession_ids?.includes(professionId)) continue;
      }

      let matches = false;

      if (rule.rule_type === 'holiday') {
        matches = true;
      } else if (rule.rule_type === 'day_of_week') {
        matches = (rule.days_of_week || []).includes(brDay);
      } else if (rule.rule_type === 'time_range') {
        const timeStart = parseTimeToMinutes(rule.time_start);
        const timeEnd = parseTimeToMinutes(rule.time_end);

        if (timeStart !== null && timeEnd !== null) {
          if (timeStart <= timeEnd) {
            matches = brTimeMinutes >= timeStart && brTimeMinutes < timeEnd;
          } else {
            matches = brTimeMinutes >= timeStart || brTimeMinutes < timeEnd;
          }
        }

        if (matches && rule.days_of_week?.length > 0) {
          matches = rule.days_of_week.includes(brDay);
        }
      }

      if (matches) {
        applicable.push({
          id: rule.id,
          name: rule.name,
          surcharge_percent: rule.surcharge_percent,
          rule_type: rule.rule_type,
          description: rule.description || '',
        });
      }
    }

    const totalPercent = applicable.reduce((sum, r) => sum + r.surcharge_percent, 0);
    const multiplier = 1 + totalPercent / 100;

    return jsonResponse({
      applicable,
      total_surcharge_percent: totalPercent,
      multiplier,
      reference_time: `${String(Math.floor(brHour)).padStart(2, '0')}:${String(brMinutes).padStart(2, '0')}`,
      day_of_week: brDay,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
