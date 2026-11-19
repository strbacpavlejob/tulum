'use strict';

/*
 * ESLint plugin "tulum" with one rule, file-naming: file and folder names are
 * kebab-case, as docs/conventions.md describes. Each app turns it on in its
 * eslint.config with its own options:
 *
 *   root             the app folder, which names are checked relative to;
 *                    the folder of the nearest package.json by default
 *   routes           the router's folder ("app", "src/app"), where Expo
 *                    Router and Next.js route names are allowed: (group),
 *                    [id], [...slug], [[...slug]], _private, @slot, _layout,
 *                    +not-found, +html
 *   middleExtensions the dot parts allowed between a name and its extension
 *                    ("listings-map.web.tsx"), or "any" (NestJS roles such
 *                    as "events-feed.service.ts")
 *
 * Folders starting with a dot (.expo, .next) are skipped.
 */

const fs = require('node:fs');
const path = require('node:path');

const packageRoots = new Map();

/** The folder of the nearest package.json at or above dir, or null. */
function packageRoot(dir) {
  if (packageRoots.has(dir)) return packageRoots.get(dir);
  const parent = path.dirname(dir);
  const root = fs.existsSync(path.join(dir, 'package.json'))
    ? dir
    : parent === dir
      ? null
      : packageRoot(parent);
  packageRoots.set(dir, root);
  return root;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_FOLDER =
  /^(?:\([a-z0-9-]+\)|\[[a-z0-9-]+\]|\[\.\.\.[a-z0-9-]+\]|\[\[\.\.\.[a-z0-9-]+\]\]|_[a-z0-9-]+|@[a-z0-9-]+)$/;
const ROUTE_FILE =
  /^(?:_layout|\+not-found|\+html|\+native-intent|\[[a-z0-9-]+\]|\[\.\.\.[a-z0-9-]+\]|\[\[\.\.\.[a-z0-9-]+\]\])$/;
// A name, then its dot parts: "[...slug].tsx", "listings-map.web.tsx".
const PARTS =
  /^(\[\[\.\.\.[^\]]+\]\]|\[\.\.\.[^\]]+\]|\[[^\]]+\]|[^.]+)((?:\.[^.]+)*)$/;

const toKebab = (value) =>
  value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

const fileNaming = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'File and folder names are kebab-case (docs/conventions.md).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          root: { type: 'string' },
          routes: { type: ['string', 'null'] },
          middleExtensions: {
            anyOf: [
              { type: 'array', items: { type: 'string' } },
              { enum: ['any'] },
            ],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      folder: "Folder '{{name}}' should be kebab-case: '{{suggestion}}'.",
      file: "File name '{{name}}' should be kebab-case: '{{suggestion}}'.",
      middle:
        "'.{{part}}' in '{{name}}' isn't a suffix this app uses ({{allowed}}).",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const root =
      options.root ??
      packageRoot(path.dirname(context.filename)) ??
      context.cwd;
    const routes = options.routes ? options.routes.split('/') : null;
    const middleExtensions = options.middleExtensions ?? 'any';

    const relative = path.relative(root, context.filename);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      return {};
    }
    const segments = relative.split(path.sep);
    const inRoutes =
      routes !== null && routes.every((part, i) => segments[i] === part);

    return {
      Program(node) {
        for (const folder of segments.slice(0, -1)) {
          // Generated folders such as .expo and .next.
          if (folder.startsWith('.')) return;
          if (KEBAB.test(folder) || (inRoutes && ROUTE_FOLDER.test(folder))) {
            continue;
          }
          context.report({
            node,
            messageId: 'folder',
            data: { name: folder, suggestion: toKebab(folder) },
          });
        }

        const file = segments[segments.length - 1];
        const match = PARTS.exec(file);
        if (!match) return;
        const [, name, dotted] = match;
        const parts = dotted.split('.').filter(Boolean).slice(0, -1);

        if (!KEBAB.test(name) && !(inRoutes && ROUTE_FILE.test(name))) {
          context.report({
            node,
            messageId: 'file',
            data: { name: file, suggestion: toKebab(name) + dotted },
          });
        }

        for (const part of parts) {
          const allowed =
            middleExtensions === 'any'
              ? KEBAB.test(part)
              : middleExtensions.includes(part);
          if (allowed) continue;
          context.report({
            node,
            messageId: 'middle',
            data: {
              part,
              name: file,
              allowed:
                middleExtensions === 'any'
                  ? 'kebab-case parts only'
                  : middleExtensions.map((p) => '.' + p).join(', '),
            },
          });
        }
      },
    };
  },
};

module.exports = {
  meta: { name: 'tulum' },
  rules: { 'file-naming': fileNaming },
};
