import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const allowedRoot = new Set(['.gitignore', '.gitattributes', 'AGENTS.md', 'PRD.md', 'README.md', 'index.html', 'package.json']);
const allowed = file => allowedRoot.has(file) || /^src\/(?:locales\/)?[\w-]+\.(?:js|css|html)$/.test(file) || /^scripts\/[\w-]+\.mjs$/.test(file) || file === '.github/workflows/pages.yml';
const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
assert.ok(files.length, 'Stage the audited source files before checking the public manifest.');
for (const file of files) {
  assert.ok(allowed(file), `Unapproved public file: ${file}`);
  assert.equal((await lstat(path.join(root, file))).isSymbolicLink(), false, `Symlink not allowed: ${file}`);
}
const history = git(['log', '--all', '--format=', '--name-only']).split('\n').filter(Boolean);
assert.ok(history.every(file => !/^(?:reference|private|conversation-exports)\//i.test(file)), 'Private inputs appear in Git history. Stop before publishing.');
assert.equal(git(['ls-files', '--', 'reference']).trim(), '', 'Research is tracked.');
assert.equal(git(['log', '--all', '--oneline', '--', 'reference']).trim(), '', 'Research appears in Git history.');
assert.deepEqual((await readdir(path.join(root, 'dist'))).sort(), ['.nojekyll', 'index.html']);
for (const file of ['.nojekyll', 'index.html']) assert.equal((await lstat(path.join(root, 'dist', file))).isSymbolicLink(), false);
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
assert.ok(!/(?:src|href)=["'](?:https?:)?\/\/|@import|sourceMappingURL|\/Users\/|reference\//i.test(html), 'Unexpected external or private content in the deploy artifact.');
const workflow = await readFile(path.join(root, '.github/workflows/pages.yml'), 'utf8');
assert.match(workflow, /uses: actions\/upload-pages-artifact@v4\s+with:\s+path: \.\/dist/);
assert.ok(!/path:\s*['"]?\.\/?['"]?\s*$/m.test(workflow), 'Do not upload the checkout root.');
console.log(`Public audit passed: ${files.length} allowlisted files; no research in tracked files/history; dist contains only standalone HTML and .nojekyll.`);
