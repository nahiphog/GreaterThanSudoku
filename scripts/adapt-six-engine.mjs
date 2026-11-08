import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root='src/vendor/sudokui', out='src/vendor/sudokui-six';
const seen=new Set();
const check=process.argv.includes('--check');
function write(target,source){
 if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==source)throw Error('Regenerate '+target);}
 else fs.writeFileSync(target,source);
}
function copy(file){
 if(seen.has(file))return;seen.add(file);
 const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});
 if(file==='ratings.ts'){write(target,"export * from '../sudokui/ratings';\n");return;}
 let source=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
 const replace=(a,b)=>{if(!source.includes(a))throw Error(`${file}: missing ${a}`);source=source.replaceAll(a,b)};
 // Rectangular geometry: six regions, each three rows by two columns.
 if(file==='humanSolver.ts') {
  source=source.replace(/import \{\s*findUniqueness,[\s\S]*?from '\.\/techniques\/uniqueness';/, '');
  source=source.replace(/import \{ findExtendedRectangle \} from '\.\/techniques\/extendedRectangle';/, '');
  source=source.replace(/^  (?:BUG_PLUS_1|UNIQUENESS_[1-6]|HIDDEN_RECTANGLE|AVOIDABLE_RECTANGLE_[12]|EXTENDED_RECTANGLE):.*\r?\n/gm, '');
 }
 if(file==='techniques/singles.ts'){replace('others.length === 8','others.length === 5');replace('other eight digits','other five digits');}
 if(file==='board.ts'){
  source=source.replaceAll('the 20 peers','the 12 peers').replaceAll('units[0..8] rows, units[9..17] cols, units[18..26] boxes','units[0..5] rows, units[6..11] cols, units[12..17] boxes');
  source=source.replaceAll('81','36').replaceAll('9-bit','6-bit').replaceAll('1..9','1..6');

  replace('const bc = (b % 3) * 3','const bc = (b % 3) * 2');
  replace('c < 3; c++','c < 2; c++');replace('Math.floor(c / 3)','Math.floor(c / 2)');
  replace('Math.floor((cell % 9) / 3)','Math.floor((cell % 9) / 2)');
 }
 if(file==='text.ts'){replace('u - 8','u - 5');replace('u - 17','u - 11');}
 if(file==='techniques/singleDigit.ts'){
  replace("variant: 'SKYSCRAPER' | 'TWO_STRING_KITE' | 'TURBOT_FISH'", "variant: 'SKYSCRAPER' | 'TWO_STRING_KITE' | 'TURBOT_FISH', onlyDigit?: number");
  replace('findEmptyRectangle(g: Grid)', 'findEmptyRectangle(g: Grid, onlyDigit?: number, onlyTarget?: number)');
  replace('for (let d = 1; d <= 9; d++) {', 'for (let d = 1; d <= 9; d++) {\n    if (onlyDigit !== undefined && d !== onlyDigit) continue;');
  replace('if (g.values[target] === 0 && g.cands[target] & mask)', 'if ((onlyTarget === undefined || target === onlyTarget) && g.values[target] === 0 && g.cands[target] & mask)');
  replace('[(b % 3) * 3, (b % 3) * 3 + 1, (b % 3) * 3 + 2]','[(b % 3) * 2, (b % 3) * 2 + 1]');
  replace('Math.floor(x / 3)','Math.floor(x / 2)');replace('Math.floor(colOf(other) / 3)','Math.floor(colOf(other) / 2)');
  replace('if (!inErRow || !other)','if (inErRow === undefined || other === undefined)');
  replace('if (!inErCol || !other)','if (inErCol === undefined || other === undefined)');
 }
 if(file==='techniques/forcing.ts')replace('% 9) / 3','% 9) / 2');
 if(file==='techniques/chuteRemotePair.ts')replace('[true, false]','[true]'); // needs three lines AND three boxes
 if(file==='techniques/tridagon.ts')replace('const bands of [[0, 1], [0, 2], [1, 2]]','const bands of [[0, 1]]');
 if(file==='techniques/complexFish.ts'){
  replace('[0, 1, 2, 3, 4, 5, 6, 7, 8]','Array.from({length: 6}, (_, i) => i)');
  replace('[9, 10, 11, 12, 13, 14, 15, 16, 17]','Array.from({length: 6}, (_, i) => 9 + i)');
  replace('[18, 19, 20, 21, 22, 23, 24, 25, 26]','Array.from({length: 6}, (_, i) => 18 + i)');
 }
 if(file==='techniques/exocet.ts'){
  replace('[true, false]','[true]');replace('band < 3','band < 2');
  replace('[0, 1, 2].map((k) => cellAt(baseLine, baseBoxSlot * 3 + k))','[0, 1].map((k) => cellAt(baseLine, baseBoxSlot * 2 + k))');
  replace('skip < 3','skip < 1');replace('mini[(skip + 1) % 3]','mini[skip]');replace('mini[(skip + 2) % 3]','mini[skip + 1]');
  replace('ka < 3','ka < 2');replace('kb < 3','kb < 2');replace('slotA * 3','slotA * 2');replace('slotB * 3','slotB * 2');
  replace('[0, 1, 2, 3, 4, 5, 6, 7, 8]','[0, 1, 2, 3, 4, 5]');
 }
 // Numeric AST nodes only: do not alter scores, strings, comments, bit-counting constants, or search budgets.
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const edits=[]; const map=new Map([[9,6],[18,12],[27,18],[81,36],[511,63]]);
 function walk(n){
  if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)&&n.moduleSpecifier.text.startsWith('.'))copy(path.posix.normalize(path.posix.join(path.posix.dirname(file),n.moduleSpecifier.text+'.ts')));
  if(ts.isNumericLiteral(n)){
   let value=map.get(Number(n.text));
   if(file==='techniques/chains.ts'&&n.parent?.name?.text==='maxLen')value=undefined;
   if(file==='techniques/forcingTrail.ts'&&Number(n.text)===729)value=216;
   if(value!==undefined)edits.push([n.getStart(ast),n.end,String(value)]);
  }
  ts.forEachChild(n,walk);
 }
 walk(ast);
 for(const [a,b,value] of edits.reverse())source=source.slice(0,a)+value+source.slice(b);
 write(target,'// Generated 6x6 adaptation. Edit scripts/adapt-six-engine.mjs, then regenerate.\n'+source);
}
copy('humanSolver.ts');
console.log(`Adapted ${seen.size} modules.`);
