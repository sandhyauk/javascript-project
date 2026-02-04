const { DateTime } = require('luxon');

// Input variables (in Eastern time)
const enableDate = '2025-04-23';
const enableTime = '10:00'; // 24-hour format
const disableDate = '2025-04-29';
const disableTime = '23:59'; // 24-hour format

// Function to format date with ordinal suffix
function getFormattedDate(dt) {
  const day = dt.day;
  const suffix = (d => ['th','st','nd','rd'][(d%10>3||~~(d%100/10)==1)?0:d%10])(day);
  return `${dt.toFormat("MMMM")} ${day}${suffix}`;
}

// Function to format output for a location
function printForLocation(city, timezone, label) {
  const enableDT = DateTime.fromISO(`${enableDate}T${enableTime}`, { zone: 'America/New_York' }).setZone(timezone);
  const disableDT = DateTime.fromISO(`${disableDate}T${disableTime}`, { zone: 'America/New_York' }).setZone(timezone);

  const enable12hr = enableDT.toFormat("hh:mm a").toLowerCase();
  const disable12hr = disableDT.toFormat("hh:mm a").toLowerCase();
  const disableMilitary = disableDT.toFormat("HH:mm");

  console.log(`• Enable ${getFormattedDate(enableDT)} at ${enable12hr} ${label}`);
  console.log(`• Disable ${getFormattedDate(disableDT)} at ${disable12hr} ${label} / military time ${disableMilitary}`);
  console.log("");
}

// Seattle
printForLocation("Seattle", "America/Los_Angeles", "Pacific");

// LA
printForLocation("LA", "America/Los_Angeles", "Pacific");

// Cincinnati and Nashville - Dual Timezone Print
const enableEastern = DateTime.fromISO(`${enableDate}T${enableTime}`, { zone: 'America/New_York' });
const disableEastern = DateTime.fromISO(`${disableDate}T${disableTime}`, { zone: 'America/New_York' });

const enableCentral = enableEastern.setZone('America/Chicago');
const disableCentral = disableEastern.setZone('America/Chicago');

console.log(`• Enable ${getFormattedDate(enableEastern)} at ${enableEastern.toFormat("hh:mm a").toLowerCase()} EASTERN (Cincinnati) // ${enableCentral.toFormat("hh:mm a").toLowerCase()} Central (Nashville)`);
console.log(`• Disable ${getFormattedDate(disableEastern)} at ${disableEastern.toFormat("hh:mm a").toLowerCase()} EASTERN (Cincinnati) // ${disableCentral.toFormat("hh:mm a").toLowerCase()} Central (Nashville) military ${disableCentral.toFormat("HH:mm")}`);
