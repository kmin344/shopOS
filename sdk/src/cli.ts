#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { createShopClient } from './client';
import { generateFieldTypes } from './fields';

const USAGE = `Usage: shopos-sdk types --url <graphql url> [--out <file>]

Reads the store's custom field definitions and writes TypeScript types.
Without --out, the types are printed.`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (command !== 'types' || !flag('--url')) {
    console.error(USAGE);
    return 2;
  }
  const url = flag('--url')!;
  const definitions = await createShopClient({ url }).customFieldDefinitions();
  const source = generateFieldTypes(definitions, url);
  const out = flag('--out');
  if (out) {
    writeFileSync(out, source);
    console.error(`Wrote ${definitions.length} field(s) to ${out}`);
  } else {
    process.stdout.write(source);
  }
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(`shopos-sdk: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  },
);
