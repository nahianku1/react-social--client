export function getCallDuration(date: Date | string): string {
  const start = typeof date === 'string' ? new Date(date) : date;
  const end = new Date();
  let diff = Math.floor((end.getTime() - start.getTime()) / 1000);

  const hours = Math.floor(diff / 3600);
  diff %= 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
