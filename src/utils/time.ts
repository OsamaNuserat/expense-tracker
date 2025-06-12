export function getISOTimestamp(input?: string): string {
  if (input) {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    } else {
      throw new Error('Invalid timestamp format');
    }
  }

  const nowJordan = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Amman'
  });
  return new Date(nowJordan).toISOString();
}
