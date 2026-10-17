// Exports one interview as the static Demo Interview (ADR 0002) bundled into the client.
//   npm run demo:export -- --session <id>
//
// It reads the interview through the same include and DTO conversion as GET /sessions/:id,
// so the JSON has exactly the shape the interview page already renders. SessionDetailDto
// carries no user id or email, so nothing personal leaves the database. Re-run it whenever
// the DTO shape changes; the client's type check will flag a stale file.
import { writeFile } from 'fs/promises';
import path from 'path';
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma';
import { toSessionDetailDto, withLatestAttempt } from '../src/lib/dto';

const { values } = parseArgs({ options: { session: { type: 'string' } } });
if (values.session === undefined) {
  console.error('Usage: npm run demo:export -- --session <interview id>');
  process.exit(1);
}

const session = await prisma.session.findUnique({ where: { id: values.session }, include: withLatestAttempt });
if (session === null) {
  console.error(`No interview with id "${values.session}"`);
  process.exit(1);
}

const detail = toSessionDetailDto(session);
const answered = detail.questions.filter((q) => q.latestAttempt !== null);
if (answered.length === 0 || answered.some((q) => q.latestAttempt?.score === null)) {
  console.error('The demo needs at least one answered question, and every answer needs a readable report.');
  process.exit(1);
}

const demo = {
  // Shown on the demo page, so visitors know what they're looking at.
  note: 'A sample interview. The company and job are fictional, and the answer was written for this demo with typical non-native errors. The questions and the feedback are real model output.',
  exportedAt: new Date().toISOString(),
  session: detail,
};

const outFile = path.join(import.meta.dirname, '../../client/src/demo/demoInterview.json');
await writeFile(outFile, JSON.stringify(demo, null, 2) + '\n');
console.log(`✓ ${detail.questions.length} questions, ${answered.length} answered → ${path.relative(process.cwd(), outFile)}`);
await prisma.$disconnect();
