import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const sdk = process.env.PI_PACKAGE_ROOT;
test('Pi loader, restored history, real assistant renderer and model context', {skip:!sdk}, async () => {
 process.env.TERM_PROGRAM='WarpTerminal';
 const root=mkdtempSync(join(tmpdir(),'pi-links-integration-'));
 try {
  const {loadExtensions}=await import(pathToFileURL(join(sdk,'dist/core/extensions/loader.js')));
  const {convertToLlm}=await import(pathToFileURL(join(sdk,'dist/core/messages.js')));
  const {SessionManager}=await import(pathToFileURL(join(sdk,'dist/core/session-manager.js')));
  const {AssistantMessageComponent}=await import(pathToFileURL(join(sdk,'dist/modes/interactive/components/assistant-message.js')));
  const {initTheme}=await import(pathToFileURL(join(sdk,'dist/modes/interactive/theme/theme.js')));
  initTheme('dark',false);
  const paths=[fileURLToPath(new URL('../index.js',import.meta.url))];
  if(process.env.PI_COMPACT_UI) paths.unshift(process.env.PI_COMPACT_UI);
  const result=await loadExtensions(paths,root);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.extensions.length,paths.length);
  const ext=result.extensions.at(-1);
  const manager=SessionManager.create(root,join(root,'sessions'));
  const names=['report.md','index.html','paper.pdf','chart.png','odd).html'];
  for(const n of names) writeFileSync(join(root,n),'fixture');
  const source=names.map(n=>`[${n}](<${n}>)`).join('\n\n');
  const message={role:'assistant',content:[{type:'text',text:source}],api:'openai-responses',provider:'test',model:'test',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()};
  manager.appendMessage({role:'user',content:'fixture',timestamp:Date.now()});
  manager.appendMessage(message);
  const sessionPath=manager.getSessionFile();
  const before=readFileSync(sessionPath,'utf8');
  const restored=SessionManager.open(sessionPath);
  for(const handler of ext.handlers.get('session_start')) await handler({type:'session_start',reason:'resume'},{mode:'tui',cwd:root,sessionManager:restored});
  const saved=restored.buildSessionContext().messages.find(m=>m.role==='assistant');
  const snapshot=JSON.stringify(saved);
  const llmBefore=JSON.stringify(convertToLlm(restored.buildSessionContext().messages));
  const component=new AssistantMessageComponent(saved,false,undefined,undefined,1,[ext.markdownTransformer]);
  for(const width of [100,36,150]) {
   const output=component.render(width).join('\n');
   for(const n of names) {
    const uri=pathToFileURL(join(root,n)).href.replaceAll(')', '%29');
    assert.ok(output.includes('\x1b]8;;'+uri+'\x1b\\'),`missing OSC8 ${n}`);
   }
  }
  assert.equal(JSON.stringify(saved),snapshot);
  assert.equal(JSON.stringify(convertToLlm(restored.buildSessionContext().messages)),llmBefore);
  assert.equal(readFileSync(sessionPath,'utf8'),before);
  assert.equal(restored.buildSessionContext().messages.find(m=>m.role==='assistant').content[0].text,source);
 } finally {rmSync(root,{recursive:true,force:true});}
});
