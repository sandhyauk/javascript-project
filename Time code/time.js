const { DateTime } = require('luxon');

// 🧼 Clean up date input (e.g., "May 11th" → "May 11")
function cleanDate(dateStr) {
  return dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1');
}

// 🧭 Parse a date + time string in a base timezone (ET by default)
function parseDateTime(dateStr, timeStr, zone = 'America/New_York') {
  const cleanedDate = cleanDate(dateStr);
  return DateTime.fromFormat(`${cleanedDate} ${timeStr}`, 'LLLL d h:mma', { zone });
}

// 📆 Add ordinal suffix to day (1st, 2nd, 3rd, etc.)
function getFormattedDate(dt) {
  const day = dt.day;
  const suffix = (d => ['th','st','nd','rd'][(d % 10 > 3 || ~~(d % 100 / 10) === 1) ? 0 : d % 10])(day);
  return `${dt.toFormat("MMMM")} ${day}${suffix}`;
}

// 🕘 Inputs
const enableDateStr = 'June 15th';
const enableTimeStr = '12:00pm';
const disableDateStr = 'July 13th';
const disableTimeStr = '11:59pm';

// 🔄 Parse in Eastern Time
const enableEastern = parseDateTime(enableDateStr, enableTimeStr);
const disableEastern = parseDateTime(disableDateStr, disableTimeStr);

// 🔁 Convert to other zones
const enableCentral = enableEastern.setZone('America/Chicago');
const disableCentral = disableEastern.setZone('America/Chicago');

const enablePacific = enableEastern.setZone('America/Los_Angeles');
const disablePacific = disableEastern.setZone('America/Los_Angeles');

// ✅ Print final output
console.log(`Eastern\n`);
console.log(`• Enable ${getFormattedDate(enableEastern)} at ${enableEastern.toFormat("hh:mm a")} EASTERN`);
console.log(`• Disable ${getFormattedDate(disableEastern)} at ${disableEastern.toFormat("hh:mm a")} EASTERN military time ${disableEastern.toFormat("HH:mm")}\n`);

console.log(`Seattle (et-3)\n`);
console.log(`• Enable ${getFormattedDate(enablePacific)} at ${enablePacific.toFormat("hh:mm a")} Pacific`);
console.log(`• Disable ${getFormattedDate(disablePacific)} at ${disablePacific.toFormat("hh:mm a")} Pacific military time ${disablePacific.toFormat("HH:mm")}\n`);

console.log(`LA (et-3)\n`);
console.log(`• Enable ${getFormattedDate(enablePacific)} at ${enablePacific.toFormat("hh:mm a")} Pacific`);
console.log(`• Disable ${getFormattedDate(disablePacific)} at ${disablePacific.toFormat("hh:mm a")} Pacific military time ${disablePacific.toFormat("HH:mm")}\n`);

console.log(`Cincinnati and Nashville (et-1)\n`);
console.log(`• Enable ${getFormattedDate(enableEastern)} at ${enableEastern.toFormat("hh:mm a")} EASTERN (Cincinnati) // ${enableCentral.toFormat("hh:mm a")} Central (Nashville)`);
console.log(`• Disable ${getFormattedDate(disableEastern)} at ${disableEastern.toFormat("hh:mm a")} EASTERN (Cincinnati) // ${disableCentral.toFormat("hh:mm a")} Central (Nashville) military ${disableCentral.toFormat("HH:mm")}\n`);

// 🕓 Summary (optional single-line)
console.log(`Disable ${getFormattedDate(disablePacific)} at ${disablePacific.toFormat("hh:mm a")} Pacific / ${disableCentral.toFormat("hh:mm a")} Central / ${disableEastern.toFormat("hh:mm a")} Eastern`);
