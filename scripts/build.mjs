import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFile(path.join(root, relative), 'utf8');
const assetFiles = ['src/data.js', 'src/locales/en.js', 'src/locales/risk-en.js', 'src/locales/decision-en.js', 'src/locales/wuxi-en.js', 'src/locales/portal-en.js', 'src/locales/brief-en.js', 'src/locales/zh.js', 'src/locales/risk-zh.js', 'src/locales/decision-zh.js', 'src/locales/wuxi-zh.js', 'src/locales/portal-zh.js', 'src/locales/brief-zh.js', 'src/locales/tour-en.js', 'src/locales/tour-zh.js', 'src/tour-view.js', 'src/dashboard-view.js', 'src/core.js', 'src/workflow.js', 'src/i18n.js', 'src/brief.js', 'src/brief-view.js', 'src/decision-view.js', 'src/wuxi-view.js', 'src/risk-view.js', 'src/forecast-view.js', 'src/app.js'];
const [shell, css, ...scripts] = await Promise.all([read('src/shell.html'), read('src/styles.css'), ...assetFiles.map(read)]);
const localeContext = {};
vm.runInNewContext(scripts[1], localeContext);
const metadata = localeContext.DEMO_MESSAGES.en.meta;
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function render(styles, scriptTags) {
  return shell.replace(/\{\{(title|description|noscript)\}\}/g, (_, key) => escape(metadata[key]))
    .replace('{{styles}}', styles).replace('{{scripts}}', scriptTags);
}

// Build inputs are an explicit allowlist. Private research is never enumerated or copied.
const development = render('<link rel="stylesheet" href="./src/styles.css">', assetFiles.map(file => `<script defer src="./${file}"></script>`).join('\n  '));
const portable = render(`<style>\n${css}\n</style>`, scripts.map(code => `<script>\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n'));
if (/\{\{(?:styles|scripts|title|description|noscript)\}\}/.test(portable)) throw new Error('Unresolved shell placeholder');
if (/(?:src|href)=["'](?:https?:)?\/\//i.test(portable) || /@import|sourceMappingURL|\/Users\/|reference\//.test(portable)) throw new Error('Unexpected external or private asset in portable output');
await mkdir(path.join(root, 'dist'), { recursive: true });
const existing = await readdir(path.join(root, 'dist'));
if (existing.some(name => !['index.html', '.nojekyll'].includes(name))) throw new Error('Unexpected dist file; review output before packaging');
await writeFile(path.join(root, 'index.html'), development);
await writeFile(path.join(root, 'dist/index.html'), portable);
await writeFile(path.join(root, 'dist/.nojekyll'), '');
console.log(`Built relative-path index.html and standalone dist/index.html (${Math.ceil(Buffer.byteLength(portable) / 1024)} KB). No external runtime assets.`);
