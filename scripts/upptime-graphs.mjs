#!/usr/bin/env node
// Canvas-free replacement for @upptime/graphs (its native canvas dep crashes on modern
// Node, so it writes nothing). Run after the `readme` step. Env: GH_PAT, GITHUB_REPOSITORY.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const token = process.env.GH_PAT ?? process.env.GITHUB_TOKEN;
if (!owner || !repo) throw new Error("GITHUB_REPOSITORY not set");

const uptimeColor = (u) =>
  u > 95 ? "brightgreen" : u > 90 ? "green" : u > 85 ? "yellowgreen" : u > 80 ? "yellow" : u > 75 ? "orange" : "red";
const responseColor = (t) =>
  t === 0 ? "red" : t < 200 ? "brightgreen" : t < 400 ? "green" : t < 600 ? "yellowgreen" : t < 800 ? "yellow" : t < 1000 ? "orange" : "red";

const DAY = 86_400_000;
const periods = [
  { key: "", suffix: "", label: "", ms: Infinity },
  { key: "Day", suffix: "-day", label: " 24h", ms: DAY },
  { key: "Week", suffix: "-week", label: " 7d", ms: 7 * DAY },
  { key: "Month", suffix: "-month", label: " 30d", ms: 30 * DAY },
  { key: "Year", suffix: "-year", label: " 1y", ms: 365 * DAY },
];

const badges = (site) =>
  periods.flatMap(({ key, suffix, label }) => {
    const uptime = Number.parseFloat(site[`uptime${key}`] ?? "0");
    const time = Number(site[`time${key}`] ?? 0);
    return [
      [`uptime${suffix}.json`, { schemaVersion: 1, label: `uptime${label}`, message: `${uptime}%`, color: uptimeColor(uptime) }],
      [`response-time${suffix}.json`, { schemaVersion: 1, label: `response time${label}`, message: `${time} ms`, color: responseColor(time) }],
    ];
  });

// Checkout is shallow, so read the response-time series from the commit history via the API.
async function responseTimeSeries(slug) {
  const series = [];
  for (let page = 1; page <= 30; page++) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    url.search = new URLSearchParams({ path: `history/${slug}.yml`, per_page: "100", page: String(page) }).toString();
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "tempus-status" },
    });
    if (!res.ok) break;
    const commits = await res.json();
    for (const { commit } of commits) {
      if (!commit.message.includes(" in ")) continue;
      const ms = Number.parseInt(commit.message.split(" in ")[1], 10);
      if (ms) series.push([Date.parse(commit.author.date), ms]);
    }
    if (commits.length < 100) break;
  }
  return series.sort(([a], [b]) => a - b);
}

function sparkline(points) {
  const [w, h, pad] = [600, 400, 8];
  if (points.length < 2)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"></svg>\n`;
  const ys = points.map(([, ms]) => ms);
  const min = Math.min(...ys);
  const span = Math.max(...ys) - min || 1;
  const coords = points
    .map(([, ms], i) => {
      const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((ms - min) / span) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<polyline fill="none" stroke="#34d399" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" points="${coords}"/></svg>\n`
  );
}

const summary = JSON.parse(await readFile("history/summary.json", "utf8"));
let readme = await readFile("README.md", "utf8");

for (const site of summary) {
  const { slug } = site;
  await Promise.all([mkdir(`api/${slug}`, { recursive: true }), mkdir(`graphs/${slug}`, { recursive: true })]);

  const series = await responseTimeSeries(slug);
  const now = Date.now();
  await Promise.all([
    ...badges(site).map(([name, body]) => writeFile(`api/${slug}/${name}`, JSON.stringify(body))),
    ...periods
      .filter(({ key }) => key)
      .map(({ suffix, ms }) => writeFile(`graphs/${slug}/response-time${suffix}.svg`, sparkline(series.filter(([t]) => t > now - ms)))),
    writeFile(`graphs/${slug}/response-time.svg`, sparkline(series)),
  ]);

  // The README thumbnail hardcodes .png; point it at the .svg we generate.
  readme = readme.replaceAll(`/graphs/${slug}/response-time-week.png`, `/graphs/${slug}/response-time-week.svg`);
}

await writeFile("README.md", readme);
console.log(`Generated api/ + graphs/ for ${summary.length} site(s).`);
