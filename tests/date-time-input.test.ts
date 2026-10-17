import assert from "node:assert/strict";
import {
  normalizeDateDraft,
  parseDisplay,
  displayDateTime,
  parseIsoDate,
  isoDate,
} from "../src/lib/date-time-input";
assert.equal(parseDisplay("29/02/2024", "date"), "2024-02-29");
for (const text of [
  "29/02/2023",
  "31/04/2024",
  "00/01/2024",
  "01/13/2024",
  "1/2/2024",
  "2024-02-29",
  "29/02/2024 12:00",
])
  assert.equal(parseDisplay(text, "date"), null);
assert.equal(
  parseDisplay("01/03/2099 08:30", "datetime-local"),
  "2099-03-01T08:30",
);
assert.equal(
  displayDateTime("2099-03-01T08:30", "datetime-local"),
  "01/03/2099 08:30",
);
assert.equal(parseDisplay("23:59", "time"), "23:59");
for (const text of ["24:00", "12:60", "8:00", "08:00:00"])
  assert.equal(parseDisplay(text, "time"), null);
for (const mode of ["date", "time", "datetime-local"] as const)
  assert.equal(parseDisplay("", mode), "");
for (const text of ["2024-02-29", "1990-01-01", "2099-12-31"])
  assert.equal(isoDate(parseIsoDate(text)!), text);
assert.equal(parseIsoDate("2023-02-29"), undefined);

assert.equal(normalizeDateDraft("29022024", "date"), "29/02/2024");
assert.equal(
  parseDisplay(normalizeDateDraft("29022024", "date"), "date"),
  "2024-02-29",
);
assert.equal(normalizeDateDraft("23:59", "time"), "23:59");

console.log(
  "PASS strict Vietnamese date/time input, leap dates, canonical formats, empty values and date-only timezone preservation",
);
