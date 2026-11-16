#!/usr/bin/env node
// The KST Maskenbal poster kit (QA QR-7): one QR code per poster as an SVG
// for the print shop, a print sheet with each poster on its own A4 page, and
// the staff help card.
//
//   node scripts/poster-kit/make-posters.mjs --event <event id> [--posters 12]
//
// Poster pNN's code opens https://mobile.tulum-app.com/e/<event id>?src=pNN
// directly, with no redirect, and the API keeps pNN as the guest's source,
// so you can see afterwards which spots worked. The short link printed under
// each code, tulum-app.com/maskenbal, is the host's redirect to the same page
// (MASKENBAL_EVENT_ID), counted as src=short. Other options: --title,
// --web (the web app), --short and --out. See README.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { toQR } from "toqr";

/** Error correction Q: a code still reads with a quarter of it scuffed. */
const EC_QUARTILE = 3;
/** The white border a code needs, in modules (the QR standard's 4). */
const QUIET_ZONE = 4;
const EVENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUPPORT_EMAIL = "tulum.app.official@gmail.com";
const LOGO = `<svg viewBox="0 0 744 622" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M36.9492 341.045C101.849 487.045 298.449 581.945 362.649 609.745C365.449 610.745 368.349 611.145 371.149 611.145C374.049 611.045 376.749 610.445 379.249 609.345C381.749 608.245 384.049 606.645 385.949 604.545C387.849 602.545 389.449 600.045 390.649 597.245C413.149 531.045 474.749 321.645 409.949 175.545C382.349 113.445 336.349 62.6453 281.849 34.2453C227.449 5.84527 169.049 2.24527 119.649 24.2453C70.1492 46.1453 33.6492 91.8452 18.1492 151.245C2.64925 210.645 9.44924 278.945 36.9492 341.045Z" fill="#18181b" stroke="#6747f7" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M706.349 341.045C641.549 487.045 444.949 581.945 380.749 609.745C377.849 610.745 374.949 611.145 372.149 611.145C369.349 611.045 366.649 610.445 364.149 609.345C361.549 608.245 359.349 606.645 357.349 604.545C355.449 602.545 353.849 600.045 352.749 597.245C330.149 531.045 268.649 321.645 333.449 175.545C360.949 113.445 407.049 62.6453 461.449 34.2453C515.949 5.84527 574.249 2.24527 623.749 24.2453C673.149 46.1453 709.649 91.8452 725.149 151.245C740.649 210.645 733.849 278.945 706.349 341.045Z" fill="#6747f7" stroke="#6747f7" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M200.349 294.845C159.349 294.845 126.249 261.745 126.249 220.745C126.249 179.745 159.349 146.645 200.349 146.645C241.349 146.645 274.449 179.745 274.449 220.745C274.449 261.745 241.349 294.845 200.349 294.845Z" fill="#6747f7" stroke="#18181b" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M532.349 307.845C491.349 307.845 458.249 274.745 458.249 233.745C458.249 192.745 491.349 159.645 532.349 159.645C573.349 159.645 606.449 192.745 606.449 233.745C606.449 274.745 573.349 307.845 532.349 307.845Z" fill="#18181b" stroke="#6747f7" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const { values } = parseArgs({
  options: {
    event: { type: "string" },
    posters: { type: "string", default: "12" },
    title: { type: "string", default: "KST Maskenbal" },
    web: { type: "string", default: "https://mobile.tulum-app.com" },
    short: { type: "string", default: "tulum-app.com/maskenbal" },
    out: { type: "string", default: join(import.meta.dirname, "out") },
  },
});
const count = Number(values.posters);
if (
  !EVENT_ID.test(values.event ?? "") ||
  !Number.isInteger(count) ||
  count < 1 ||
  count > 99
) {
  console.error(
    "Usage: node scripts/poster-kit/make-posters.mjs --event <event id> [--posters 1-99] [--title <name>] [--out <dir>]",
  );
  process.exit(1);
}

const escapeHtml = (text) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/** A QR code as an SVG: black modules on white, inside its quiet zone. */
function qrSvg(text) {
  const modules = toQR(text, EC_QUARTILE);
  const size = Math.sqrt(modules.length);
  if (!Number.isInteger(size))
    throw new Error(`Unexpected QR size for ${text}`);
  const full = size + 2 * QUIET_ZONE;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      let run = 1;
      while (x + run < size && modules[y * size + x + run]) run++;
      path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges">` +
    `<rect width="${full}" height="${full}" fill="#fff"/><path fill="#000" d="${path}"/></svg>`
  );
}

const title = escapeHtml(values.title);
const shortLink = escapeHtml(values.short);

const posters = Array.from({ length: count }, (_, i) => {
  const code = `p${String(i + 1).padStart(2, "0")}`;
  const url = new URL(`/e/${values.event.toLowerCase()}`, values.web);
  url.searchParams.set("src", code);
  return { code, url: url.href, svg: qrSvg(url.href) };
});

const postersPage = `<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<title>${title} · Tulum posters</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; color: #18181b; background: #e9e7f2; }
  .poster { position: relative; display: flex; flex-direction: column; align-items: center; width: 210mm; height: 297mm; margin: 10mm auto; padding: 14mm 18mm 12mm; background: #fff; break-after: page; }
  .brand { display: flex; align-items: center; gap: 3mm; align-self: flex-start; font-size: 16pt; font-weight: 700; }
  .brand svg { width: 12mm; height: auto; }
  .event { margin: 9mm 0 0; font-size: 14pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6747f7; }
  h1 { margin: 3mm 0 0; font-size: 40pt; line-height: 1.05; text-align: center; }
  .en { margin: 3mm 0 0; font-size: 16pt; color: #52525b; }
  .qr { width: 122mm; height: 122mm; margin-top: 8mm; }
  .qr svg { display: block; width: 100%; height: 100%; }
  .scan { margin: 2mm 0 0; font-size: 13pt; font-weight: 600; }
  .or { margin: 6mm 0 0; font-size: 12pt; color: #52525b; }
  .short { margin: 1mm 0 0; font-size: 26pt; font-weight: 800; }
  .note { margin: auto 0 0; font-size: 10.5pt; line-height: 1.45; color: #52525b; text-align: center; }
  .code { position: absolute; right: 10mm; bottom: 6mm; font-size: 8pt; color: #a1a1aa; }
  @media print { body { background: #fff; } .poster { margin: 0; } }
</style>
</head>
<body>
${posters
  .map(
    ({ code, svg }) => `<section class="poster">
  <div class="brand">${LOGO}<span>Tulum</span></div>
  <p class="event">${title}</p>
  <h1>Upoznaj ljude na ovoj žurci</h1>
  <p class="en">Meet the people at this party</p>
  <div class="qr">${svg}</div>
  <p class="scan">Skeniraj kamerom telefona · Scan with your phone's camera</p>
  <p class="or">ili otvori · or open</p>
  <p class="short">${shortLink}</p>
  <p class="note">Radi u pregledaču telefona, ništa se ne instalira. Dozvoli lokaciju kad telefon pita.<br>Runs in your phone's browser, nothing to install. Allow location when your phone asks.</p>
  <span class="code">${code}</span>
</section>`,
  )
  .join("\n")}
</body>
</html>
`;

const staffCard = `<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<title>${title} · Tulum staff card</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; color: #18181b; background: #e9e7f2; }
  .sheet { display: grid; grid-template-columns: 1fr 1fr; width: 297mm; height: 210mm; margin: 10mm auto; background: #fff; }
  .card { display: flex; flex-direction: column; gap: 2mm; padding: 9mm 11mm; font-size: 9.5pt; line-height: 1.35; }
  .card + .card { border-left: 0.3mm dashed #a1a1aa; }
  .head { display: flex; align-items: center; gap: 3mm; }
  .head svg { width: 9mm; height: auto; }
  h1 { margin: 0; font-size: 15pt; }
  .sub { margin: 0; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6747f7; }
  h2 { margin: 2mm 0 0; font-size: 10.5pt; }
  p { margin: 0; }
  ol, ul { margin: 0; padding-left: 5mm; }
  li { margin: 0.6mm 0; }
  .contact { margin-top: auto; color: #52525b; }
  @media print { body { background: #fff; } .sheet { margin: 0; } }
</style>
</head>
<body>
<div class="sheet">
<section class="card" lang="sr">
  <div class="head">${LOGO}<h1>Tulum · ${title}</h1></div>
  <p class="sub">Kartica za osoblje</p>
  <h2>Šta je Tulum</h2>
  <p>Tulum radi u pregledaču telefona, ništa se ne instalira. Gosti se pridruže žurci na Tulum-u, a zatim se mečuju sa drugim gostima koji su večeras ovde.</p>
  <h2>Kako se gost pridružuje</h2>
  <ol>
    <li>Skenira QR kod sa plakata kamerom ili otvori <b>${shortLink}</b>.</li>
    <li>Prijavi se preko Google-a, Apple-a ili email-a.</li>
    <li>Dodirne <b>Pridruži se žurci</b>.</li>
    <li>Za mečovanje dodirne Tulum logo u donjoj traci i dozvoli lokaciju kad telefon pita. Tako se proverava da je na mestu događaja.</li>
  </ol>
  <h2>Ako nešto ne radi</h2>
  <ul>
    <li><b>Otvoreno u Instagramu ili Facebooku:</b> prijava preko Google-a i Apple-a tamo ne radi. Dodirni ⋯ na vrhu i otvori u pregledaču ili nastavi sa email adresom.</li>
    <li><b>Lokacija isključena, iPhone:</b> Podešavanja → Privatnost i bezbednost → Usluge lokacije → Safari veb-sajtovi (ili Chrome) → Dok se aplikacija koristi. Zatim <b>Proveri ponovo</b>.</li>
    <li><b>Lokacija isključena, Android:</b> ikona levo od adrese → Dozvole → Lokacija → Dozvoli. Zatim <b>Proveri ponovo</b>.</li>
    <li><b>Kaže da gost nije na mestu događaja:</b> neka priđe ulazu ili prozoru, sačeka par sekundi i dodirne <b>Proveri moju lokaciju</b>.</li>
    <li><b>Sporo ili nema veze:</b> isključi Wi-Fi i koristi mobilne podatke.</li>
    <li><b>Nije stigao email sa kodom:</b> proveri spam ili se prijavi preko Google-a ili Apple-a.</li>
  </ul>
  <h2>Pravila</h2>
  <ul>
    <li>Tulum je za 18+: ne pomaži nikome mlađem od 18 da se pridruži.</li>
    <li>Nikada ne traži niti ukucavaj tuđu lozinku ili kod; gost se prijavljuje sam.</li>
    <li>Ako neko smeta gostu, gost dodirne <b>Prijavi ili blokiraj</b> na kartici te osobe ili u ćaskanju. Sve hitno ide prvo obezbeđenju.</li>
  </ul>
  <p class="contact">Tulum podrška: ${SUPPORT_EMAIL}</p>
</section>
<section class="card" lang="en">
  <div class="head">${LOGO}<h1>Tulum · ${title}</h1></div>
  <p class="sub">Help card for staff</p>
  <h2>What it is</h2>
  <p>Tulum runs in the phone's browser; there's nothing to install. Guests join the party on Tulum, then match with other guests who are here tonight.</p>
  <h2>How a guest joins</h2>
  <ol>
    <li>Scan the QR code on a poster with the camera, or open <b>${shortLink}</b>.</li>
    <li>Sign in with Google, Apple or email.</li>
    <li>Tap <b>Join the party</b>.</li>
    <li>To match, tap the Tulum logo in the bottom bar and allow location when the phone asks. That's how Tulum checks they're at the venue.</li>
  </ol>
  <h2>If something doesn't work</h2>
  <ul>
    <li><b>Opened in Instagram or Facebook:</b> Google and Apple sign-in don't work there. Tap ⋯ at the top and open it in the browser, or continue with email.</li>
    <li><b>Location off, iPhone:</b> Settings → Privacy &amp; Security → Location Services → Safari Websites (or Chrome) → While Using the App. Then <b>Check again</b>.</li>
    <li><b>Location off, Android:</b> the icon left of the address bar → Permissions → Location → Allow. Then <b>Check again</b>.</li>
    <li><b>Says they're not at the venue:</b> move to the entrance or a window, wait a few seconds and tap <b>Check my location</b>.</li>
    <li><b>Slow or no connection:</b> turn Wi-Fi off and use mobile data.</li>
    <li><b>No email with the code:</b> check spam, or sign in with Google or Apple.</li>
  </ul>
  <h2>Rules</h2>
  <ul>
    <li>Tulum is 18+: don't help anyone under 18 join.</li>
    <li>Never ask for or type a guest's password or code; guests sign in themselves.</li>
    <li>If someone bothers a guest, the guest taps <b>Report or block</b> on that person's card or in the chat. Anything urgent goes to security first.</li>
  </ul>
  <p class="contact">Tulum support: ${SUPPORT_EMAIL}</p>
</section>
</div>
</body>
</html>
`;

mkdirSync(values.out, { recursive: true });
for (const { code, svg } of posters) {
  writeFileSync(join(values.out, `${code}.svg`), `${svg}\n`);
}
writeFileSync(join(values.out, "posters.html"), postersPage);
writeFileSync(join(values.out, "staff-card.html"), staffCard);
writeFileSync(
  join(values.out, "codes.csv"),
  `poster,url,placed at\n${posters.map(({ code, url }) => `${code},${url},`).join("\n")}\n`,
);
console.log(`${count} posters for ${values.title} in ${values.out}`);
console.log(`Scan this one from the screen before printing: ${posters[0].url}`);
