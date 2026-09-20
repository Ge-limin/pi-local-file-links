import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rewriteLocalLinks, resolveFileHref } from '../links.js';
import extension from '../index.js';

const root = mkdtempSync(join(tmpdir(), 'pi-links-'));
mkdirSync(join(root, 'docs'));
for (const f of ['report.md','index.html','paper.pdf','chart.png','中文 报告.html','a(b).html','a b.html','hash#name.html','amp&name.html','tick`name.html','code.ts']) writeFileSync(join(root,'docs',f),'fixture');
process.on('exit', () => rmSync(root,{recursive:true,force:true}));
const options = {cwd:root};
const url = name => pathToFileURL(join(root,'docs',name)).href.replaceAll('(', '%28').replaceAll(')', '%29');
const change = source => rewriteLocalLinks(source,options);
for (const f of ['report.md','index.html','paper.pdf','chart.png','a(b).html']) {
 test(`file ${f}`,()=>assert.equal(change(`[文件](docs/${f})`),`[文件](${url(f)})`));
}
for (const [source, expected] of [
 ['[标题](<docs/中文 报告.html> "title")',`[标题](<${url('中文 报告.html')}> "title")`],
 ['[报告](docs/a%20b.html#summary)',`[报告](${url('a b.html')}#summary)`],
 ['[报告](docs/index.html?q=1#summary)',`[报告](${url('index.html')}?q=1#summary)`],
 ['[报告](docs/hash%23name.html)',`[报告](${url('hash#name.html')})`],
 ['[报告](docs/amp&amp;name.html)',`[报告](${url('amp&name.html')})`],
 ['[**报告**](docs/report.md)',`[**报告**](${url('report.md')})`],
 ['[报告][r]\n\n[r]: docs/report.md "title"\n',`[报告][r]\n\n[r]: ${url('report.md')} "title"\n`],
 ['> - [报告](docs/report.md)\n',`> - [报告](${url('report.md')})\n`],
 ['| A |\n| - |\n| [报告](docs/report.md) |',`| A |\n| - |\n| [报告](${url('report.md')}) |`],
 ]) test(source,()=>assert.equal(change(source),expected));
for (const source of [
 '`[报告](docs/report.md)`', '```md\n[报告](docs/report.md)\n```',
 '    [报告](docs/report.md)\n', '![图](docs/chart.png)',
 '[报告][r]\n![图][r]\n\n[r]: docs/chart.png',
 '[网页](https://example.com/a)', '[编辑](vscode://file/a)', '[本地](file:///tmp/a)',
 '[锚点](#here)', '[根](//example.com/a)', '[缺失](docs/missing.md)',
 '[代码](docs/code.ts:42)', '[路径](docs%2freport.md)', '[路径](docs/a%zz.html)',
 '[路径](docs/a%00.html)', '[路径](docs/a%1b.html)', '[未完成](docs/report.md',
 '<a href="docs/report.md">报告</a>', 'docs/report.md', '[]()',
 ]) test(`unchanged ${source}`,()=>assert.equal(change(source),source));
test('absolute and home paths',()=>{
 assert.equal(resolveFileHref(join(root,'docs/report.md'),options),url('report.md'));
 assert.equal(resolveFileHref('~/docs/report.md',{cwd:'/',home:root}),url('report.md'));
});
test('ambiguous percent encoding',()=>{
 writeFileSync(join(root,'docs/a%20b.html'),'literal');
 assert.equal(change('[x](docs/a%20b.html)'),'[x](docs/a%20b.html)');
 rmSync(join(root,'docs/a%20b.html'));
});
test('suffix ambiguity',()=>{
 writeFileSync(join(root,'docs/report.md#part'),'literal');
 assert.equal(change('[x](docs/report.md#part)'),'[x](docs/report.md#part)');
});
test('idempotence and exact preservation outside href',()=>{
 const s='## 标题\n\n[x](docs/report.md) and `[x](docs/report.md)`\n';
 assert.equal(change(change(s)),change(s));
 assert.equal(change(s),s.replace('(docs/report.md)',`(${url('report.md')})`));
});
test('different resume cwd disables relative links',()=>{
 assert.equal(rewriteLocalLinks('[x](docs/report.md)',{...options,allowRelative:false}),'[x](docs/report.md)');
});
test('limits',()=>assert.equal(change('x'.repeat(100001)),'x'.repeat(100001)));
test('extension only registers display and lifecycle hooks; no message replacement',()=>{
 const events={}, transformers=[];
 extension({on:(event,fn)=>events[event]=fn, registerMarkdownTransformer:fn=>transformers.push(fn)});
 assert.deepEqual(Object.keys(events).sort(),['agent_end','session_start']);
 const original=Object.freeze({role:'assistant',content:Object.freeze([{type:'text',text:'[x](docs/report.md)'}])});
 events.session_start({}, {mode:'tui',cwd:root,sessionManager:{getHeader:()=>({cwd:root})}});
 const fn=transformers[0], ctx={messageType:'assistant',isStreaming:false,availableWidth:80};
 assert.equal(fn(original.content[0].text,ctx),`[x](${url('report.md')})`);
 assert.equal(original.content[0].text,'[x](docs/report.md)');
 for(const c of [{...ctx,isStreaming:true},{...ctx,messageType:'user'},{...ctx,messageType:'assistant-thinking'}]) assert.equal(fn('[x](docs/report.md)',c),'[x](docs/report.md)');
 events.session_start({}, {mode:'tui',cwd:'/',sessionManager:{getHeader:()=>({cwd:root})}});
 assert.equal(fn('[x](docs/report.md)',ctx),'[x](docs/report.md)');
});
