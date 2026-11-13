#!/usr/bin/env node
// Fails if any file in the repository contains an em dash, en dash or similar dash character.
// House style: use commas, colons or "to" instead. Run with `pnpm check:dashes`; CI runs it on every push.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BANNED = {
  '\u2014': 'em dash',
  '\u2013': 'en dash',
  '\u2012': 'figure dash',
  '\u2015': 'horizontal bar',
  '\u2E3A': 'two-em dash',
  '\u2E3B': 'three-em dash',
  '\uFE58': 'small em dash',
  '\uFE63': 'small hyphen-minus',
  '\uFF0D': 'fullwidth hyphen-minus',
};
const pattern = new RegExp(`[${Object.keys(BANNED).join('')}]`, 'u');
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|gz)$/i;

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && !BINARY.test(f));

let problems = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!pattern.test(text)) continue;
  text.split('\n').forEach((line, i) => {
    for (const [ch, name] of Object.entries(BANNED)) {
      let col = line.indexOf(ch);
      while (col !== -1) {
        console.error(`${file}:${i + 1}:${col + 1}: ${name} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
        problems++;
        col = line.indexOf(ch, col + 1);
      }
    }
  });
}

if (problems) {
  console.error(`\n${problems} dash character(s) found. Use a comma, a colon or "to" instead.`);
  process.exit(1);
}
console.log(`No em or en dashes in ${files.length} files.`);
