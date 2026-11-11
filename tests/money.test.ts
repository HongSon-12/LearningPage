import assert from "node:assert/strict";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../src/lib/money";
assert.equal(formatMoney(100000000), "100.000.000");
assert.equal(formatMoneyInput("100000000"), "100.000.000");
assert.equal(parseMoneyInput("100.000.000"), "100000000");
assert.equal(parseMoneyInput(" 100.000.000 "), "100000000");
assert.equal(formatMoneyInput("100000.50"), "100.000,50");
assert.equal(parseMoneyInput("100.000,50"), "100000.50");
assert.equal(parseMoneyInput("0"), "0");assert.equal(parseMoneyInput(""), "");
assert.equal(parseMoneyInput("0001"), "1");
assert.equal(parseMoneyInput("-1.000"), null);assert.equal(parseMoneyInput("1,2,3"), null);assert.equal(parseMoneyInput("abc"), null);
for (const value of [0, 1, 999, 1000, 100000000, 123456789012, 100.5]) {
  assert.equal(Number(parseMoneyInput(formatMoneyInput(String(value)))), value);
}
console.log("PASS Vietnamese money grouping, canonical form values, decimal/empty/zero handling and invalid-input rejection");
