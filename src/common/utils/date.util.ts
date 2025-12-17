/**
 * Utilitaires de gestion des dates avec timezone configurable
 */

/**
 * Obtenir la date/heure actuelle dans le timezone configuré
 * Note: process.env.TZ doit être défini au démarrage de l'application
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Obtenir la date d'aujourd'hui à minuit (heure locale)
 */
export function getToday(): Date {
  const now = getNow();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Parser une date string YYYY-MM-DD en Date UTC midi
 * Utilise UTC midi (12:00) pour éviter les décalages de jour lors des conversions timezone
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Créer en UTC midi pour éviter le décalage de jour
  return new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0, 0));
}

/**
 * Créer une Date avec heure spécifique pour aujourd'hui
 */
export function createTimeToday(timeString: string): Date {
  const now = getNow();
  const [hours, minutes] = timeString.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours!, minutes!, 0, 0);
}

/**
 * Vérifier si une date est aujourd'hui
 * Compare en utilisant les composants UTC de la date (car stockée en UTC midi)
 */
export function isToday(date: Date): boolean {
  const now = getNow();
  return (
    date.getUTCFullYear() === now.getFullYear() &&
    date.getUTCMonth() === now.getMonth() &&
    date.getUTCDate() === now.getDate()
  );
}

/**
 * Vérifier si une date est dans le passé (avant aujourd'hui)
 * Compare en utilisant les composants UTC de la date (car stockée en UTC midi)
 */
export function isPastDate(date: Date): boolean {
  const now = getNow();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  // Créer une date locale à partir des composants UTC
  const dateLocal = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
  return dateLocal < todayStart;
}

/**
 * Vérifier si une heure est dans le passé pour aujourd'hui
 */
export function isPastTimeToday(timeString: string): boolean {
  const now = getNow();
  const slotTime = createTimeToday(timeString);
  return slotTime <= now;
}

/**
 * Formater une date en YYYY-MM-DD
 * Utilise les composants UTC (car les dates sont stockées en UTC midi)
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parser une heure string HH:mm en Date (pour stockage TIME)
 * Utilise une date de référence fixe (1970-01-01) en UTC
 */
export function parseTime(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours!, minutes!, 0, 0));
}

/**
 * Formater une Date TIME en string HH:mm
 * Utilise les composants UTC
 */
export function formatTime(time: Date): string {
  const hours = String(time.getUTCHours()).padStart(2, '0');
  const minutes = String(time.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Comparer deux heures (retourne true si time1 < time2)
 */
export function isTimeBefore(time1: Date, time2: Date): boolean {
  const t1 = time1.getUTCHours() * 60 + time1.getUTCMinutes();
  const t2 = time2.getUTCHours() * 60 + time2.getUTCMinutes();
  return t1 < t2;
}

/**
 * Comparer deux heures (retourne true si time1 <= time2)
 */
export function isTimeBeforeOrEqual(time1: Date, time2: Date): boolean {
  const t1 = time1.getUTCHours() * 60 + time1.getUTCMinutes();
  const t2 = time2.getUTCHours() * 60 + time2.getUTCMinutes();
  return t1 <= t2;
}
