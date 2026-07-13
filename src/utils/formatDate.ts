export function formatDate(date: string, includeRelative = false) {
  const currentDate = new Date();

  if (!date.includes("T")) {
    date = `${date}T00:00:00`;
  }

  const targetDate = new Date(date);
  const yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
  const monthsAgo = currentDate.getMonth() - targetDate.getMonth();
  const daysAgo = currentDate.getDate() - targetDate.getDate();

  let formattedDate = "";

  if (yearsAgo > 0) {
    formattedDate = `hace ${yearsAgo} año${yearsAgo === 1 ? "" : "s"}`;
  } else if (monthsAgo > 0) {
    formattedDate = `hace ${monthsAgo} mes${monthsAgo === 1 ? "" : "es"}`;
  } else if (daysAgo > 0) {
    formattedDate = `hace ${daysAgo} día${daysAgo === 1 ? "" : "s"}`;
  } else {
    formattedDate = "Hoy";
  }

  const fullDate = targetDate.toLocaleString("es-MX", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!includeRelative) {
    return fullDate;
  }

  return `${fullDate} (${formattedDate})`;
}
