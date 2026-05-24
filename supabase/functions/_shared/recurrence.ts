export function calculateNextRecurrenceDate(currentDate: string, pattern: string): string {
  const date = new Date(`${currentDate}T12:00:00`);

  switch (pattern) {
    case 'semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'quinzenal':
      date.setDate(date.getDate() + 14);
      break;
    case 'bimestral':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'trimestral':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semestral':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}
