import 'dotenv/config';
import { connectDb } from './config/db.js';
import { ArtemisRecord, buildSearchText } from './models/ArtemisRecord.js';

async function run() {
  await connectDb();
  const cursor = ArtemisRecord.find().cursor();
  let n = 0;
  for await (const doc of cursor) {
    doc._searchText = buildSearchText(doc);
    await doc.save();
    n += 1;
  }
  console.log(`Rebuilt _searchText for ${n} Artemis record(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
