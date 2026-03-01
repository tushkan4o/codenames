const fs = require("fs");
const BT = String.fromCharCode(96);
const DS = String.fromCharCode(36);
const SQ = String.fromCharCode(39);

// Read all parts
const parts = [];
for (let i = 1; i <= 8; i++) {
  parts.push(require("./_p" + i + ".cjs"));
}

// Template literals
const tls = [
  BT + "/give-clue/" + DS + "{encodeURIComponent(newSeed)}?size=" + DS + "{boardSize}" + BT,
  BT + DS + "{currentSeed}-" + DS + "{Date.now()}" + BT,
  BT + "/give-clue/" + DS + "{encodeURIComponent(newSeed)}?size=" + DS + "{boardSize}" + BT,
  BT + DS + "{t.game.avoidPhase} (" + DS + "{selectedNulls.length} " + DS + "{t.game.nulled})" + BT,
  BT + DS + "{t.game.targetPhase} (" + DS + "{selectedTargets.length} " + DS + "{t.game.selected})" + BT,
  BT + DS + "{t.game.selectTargets} (" + DS + "{selectedTargets.length} " + DS + "{t.game.selected})" + BT,
  BT + "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors " + DS + "{\n            avoidMode\n              ? " + SQ + "bg-amber-600 hover:bg-amber-500 text-white" + SQ + "\n              : " + SQ + "bg-gray-700 hover:bg-gray-600 text-gray-300" + SQ + "\n          }" + BT,
];

// Each part ends with a newline from the heredoc.
// We need to remove the trailing newline from parts[0..6] before joining with template literal
// Part: content before template literal (ends with newline we need to trim)
// TL: the template literal itself
// Next part: content after template literal (starts with the rest of that line)

let result = "";
for (let i = 0; i < parts.length; i++) {
  if (i < tls.length) {
    // Remove trailing newline from this part so the TL joins on same line
    result += parts[i].replace(/\n$/, "") + tls[i];
  } else {
    result += parts[i];
  }
}

fs.writeFileSync("C:/claude/codenames/src/pages/ClueGivingPage.tsx", result);
console.log("Final file: " + result.length + " chars, " + result.split("\n").length + " lines");
