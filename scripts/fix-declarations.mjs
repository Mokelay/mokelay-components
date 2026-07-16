import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const value = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(value) : [value];
  }))).flat();
}

for (const file of await walk(distDir)) {
  if (!file.endsWith('.d.ts')) continue;
  const source = await readFile(file, 'utf8');
  const output = source.replace(/(['"])@\/([^'"\n]+)\1/g, (_match, quote, target) => {
    let relative = path.relative(path.dirname(file), path.join(distDir, target)).replaceAll(path.sep, '/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `${quote}${relative}${quote}`;
  });
  if (output !== source) await writeFile(file, output);
}
