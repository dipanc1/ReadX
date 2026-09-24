import { lookupWord } from '../src/services/dictionaryService';

async function main() {
  const words = ['sex', 'ubiquitous', 'Hello,', 'run', 'serendipity', 'zzzqqqxxx'];
  for (const w of words) {
    const start = Date.now();
    const res = await lookupWord(w);
    const ms = Date.now() - start;
    if (res.status === 'found') {
      const m = res.entry.meanings[0];
      console.log(`[${w}] found in ${ms}ms — ${res.entry.meanings.length} meaning(s)`);
      console.log(`  pos: ${m.partOfSpeech}`);
      console.log(`  def: ${m.definitions[0].definition.slice(0, 120)}`);
      if (m.definitions[0].example) console.log(`  ex:  ${m.definitions[0].example.slice(0, 100)}`);
      const leaked = res.entry.meanings.some((mm) =>
        mm.definitions.some((d) => /[<>]|mw-parser|\{/.test(d.definition + (d.example || '')))
      );
      console.log(`  html/css leakage: ${leaked ? 'YES — BUG' : 'none'}`);
    } else {
      console.log(`[${w}] ${res.status} in ${ms}ms`);
    }
  }
  // cache check: second lookup must be instant
  const t = Date.now();
  await lookupWord('sex');
  console.log(`[sex again] cached in ${Date.now() - t}ms`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
