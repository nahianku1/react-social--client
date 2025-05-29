export function getCallTimeDiffs(date: Date | string): string {
  const now = new Date(); // Current time
  const past = typeof date === "string" ? new Date(date) : date; // Convert input to Date if it's a string

  // Calculate time difference in milliseconds
  const diffMs = now.getTime() - past.getTime();

  // Convert milliseconds to minutes, hours, and days
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Check if the given date is today
  const isToday = now.toDateString() === past.toDateString();

  // Create a date object for "yesterday"
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  // Check if the given date is yesterday
  const isYesterday = yesterday.toDateString() === past.toDateString();

  // If the difference is less than 60 minutes
  if (diffMinutes < 60) {
    return diffMinutes === 0
      ? "just now"
      : `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }

  // If the call was earlier today (within the same date)
  if (diffHours < 24 && isToday) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  // If the call was yesterday
  if (isYesterday) {
    return "yesterday";
  }

  // If the call was within the last 7 days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  // If the call was more than a week ago, return a formatted date
  return past.toLocaleDateString();
}
