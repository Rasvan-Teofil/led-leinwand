import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const threePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'prototype', 'vendor', 'three', 'three.module.js');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: pathToFileURL(threePath).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
