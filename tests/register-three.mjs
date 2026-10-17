import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./three-resolve.mjs', import.meta.url);
