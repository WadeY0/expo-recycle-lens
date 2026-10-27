// Creates and keeps a fresh LOCAL TEST database. Never touches an application DB.
// Run from the backend root; prerequisites are in the deployment guide.
const { Client } = require('pg');
const { randomUUID, createHash } = require('node:crypto');
const {
  mkdtempSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readdirSync,
  readFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const adminUrl = process.env.REHEARSAL_ADMIN_URL;
if (!adminUrl)
  throw new Error(
    'Set REHEARSAL_ADMIN_URL to the isolated local test database',
  );
const parsed = new URL(adminUrl);
if (
  !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
  parsed.port !== '55432' ||
  parsed.pathname !== '/recycle_foundation_test'
)
  throw new Error(
    'Rehearsal requires local recycle_foundation_test on port 55432',
  );
const name = `recycle_phase4_rehearsal_${Date.now()}`;
const result = {
  database: name,
  productionCopy: false,
  migrations: [],
  checks: {},
  milliseconds: {},
};
const output =
  process.env.REHEARSAL_RESULT_FILE || join(tmpdir(), `${name}.json`);
async function main() {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }
  const target = new URL(adminUrl);
  target.pathname = '/' + name;
  const client = new Client({ connectionString: target.toString() });
  await client.connect();
  const temporary = mkdtempSync(join(tmpdir(), 'recycle-phase4-migrations-'));
  const migrations = join(temporary, 'migrations');
  mkdirSync(migrations);
  cpSync(
    join(root, 'prisma/migrations/migration_lock.toml'),
    join(migrations, 'migration_lock.toml'),
  );
  const config = join(temporary, 'prisma.config.cjs');
  writeFileSync(
    config,
    `module.exports = ${JSON.stringify({ schema: join(root, 'prisma/schema.prisma'), migrations: { path: migrations }, datasource: { url: target.toString() } })};\n`,
    { mode: 0o600 },
  );
  // The config stays outside Git with restrictive permissions; never print its content.
  const folders = readdirSync(join(root, 'prisma/migrations'))
    .filter((n) => /^20/.test(n))
    .sort();
  function deployThrough(last) {
    for (const folder of folders.filter((n) => n <= last))
      cpSync(
        join(root, 'prisma/migrations', folder),
        join(migrations, folder),
        { recursive: true },
      );
    const started = performance.now();
    execFileSync(
      join(root, 'node_modules/.bin/prisma'),
      ['migrate', 'deploy', '--config', config],
      {
        cwd: root,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: target.toString() },
      },
    );
    result.milliseconds[last] = +(performance.now() - started).toFixed(2);
  }
  try {
    deployThrough('20260624153836');
    const owner = randomUUID(),
      category = randomUUID(),
      post = randomUUID(),
      legacy = randomUUID(),
      like = randomUUID(),
      otp = randomUUID();
    await client.query(
      'INSERT INTO users (id,email,"fullName",password,"isVerified","updatedAt") VALUES ($1,$2,$3,$4,TRUE,NOW())',
      [
        owner,
        `${owner}@example.invalid`,
        'Existing fixture',
        'test-only-password-hash',
      ],
    );
    await client.query(
      'INSERT INTO categories (id,title,type,"updatedAt") VALUES ($1,$2,$3,NOW())',
      [category, 'Existing category', 'library'],
    );
    await client.query(
      'INSERT INTO articles (id,title,content,type,"categoryId","createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()),($7,$8,$9,$10,NULL,$6,NOW())',
      [
        post,
        'Preserved library',
        'Original authored content',
        'library',
        category,
        owner,
        legacy,
        'Legacy private scan',
        'Legacy snapshot',
        'ai_scan',
      ],
    );
    await client.query(
      'INSERT INTO article_likes (id,"userId","articleId") VALUES ($1,$2,$3)',
      [like, owner, post],
    );
    await client.query(
      'INSERT INTO otps (id,"expiresAt",code,"userId") VALUES ($1,NOW()+INTERVAL \'1 day\',$2,$3)',
      [otp, 'legacy-test-code', owner],
    );
    deployThrough('20261008000000_auth_foundation');
    const user = (
      await client.query(
        'SELECT "tokenVersion",password,"fullName" FROM users WHERE id=$1',
        [owner],
      )
    ).rows[0];
    assert.equal(user.tokenVersion, 0);
    assert.equal(user.password, 'test-only-password-hash');
    assert.equal(user.fullName, 'Existing fixture');
    assert.equal(
      (
        await client.query('SELECT purpose,attempts FROM otps WHERE id=$1', [
          otp,
        ])
      ).rows[0].purpose,
      null,
    );
    result.checks.foundationPreservesUserAndInvalidatesLegacyPurpose = true;
    deployThrough('20261008010000_waste_scanner_library');
    execFileSync(
      join(root, 'node_modules/.bin/ts-node'),
      [
        '-r',
        'tsconfig-paths/register',
        '-e',
        "const {PrismaClient}=require('@prisma/client'); const {PrismaPg}=require('@prisma/adapter-pg'); const {seedWaste}=require('./src/waste/data/seed-waste'); const p=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})}); seedWaste(p).finally(()=>p.$disconnect()).catch(()=>process.exitCode=1);",
      ],
      {
        cwd: root,
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: target.toString(),
        },
      },
    );
    const valid = randomUUID(),
      uncertain = randomUUID();
    for (const [id, status, reasons] of [
      [valid, 'matched', []],
      [uncertain, 'uncertain', ['low_model_score']],
    ]) {
      await client.query(
        'INSERT INTO articles (id,title,content,type,status,"createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
        [
          id,
          'Canonical historical scan',
          'Preserved scan',
          'ai_scan',
          'inactive',
          owner,
        ],
      );
      await client.query(
        'INSERT INTO scan_analyses ("articleId","wasteSlug",result) VALUES ($1,$2,$3)',
        [
          id,
          'pet-bottle',
          {
            schemaVersion: 1,
            status,
            reasons,
            matchedWaste: { slug: 'pet-bottle' },
          },
        ],
      );
    }
    const before = (
      await client.query('SELECT count(*)::int AS n FROM articles')
    ).rows[0].n;
    deployThrough('20261009000000_gamification');
    assert.equal(
      (await client.query('SELECT content FROM articles WHERE id=$1', [post]))
        .rows[0].content,
      'Original authored content',
    );
    assert.equal(
      (await client.query('SELECT content FROM articles WHERE id=$1', [legacy]))
        .rows[0].content,
      'Legacy snapshot',
    );
    assert.equal(
      (await client.query('SELECT count(*)::int AS n FROM articles')).rows[0].n,
      before,
    );
    assert.equal(
      (
        await client.query(
          'SELECT count(*)::int AS n FROM article_likes WHERE id=$1',
          [like],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await client.query('SELECT count(*)::int AS n FROM scan_analyses'))
        .rows[0].n,
      2,
    );
    const discoveries = (
      await client.query(
        'SELECT "firstScanId",historical FROM waste_discoveries WHERE "userId"=$1',
        [owner],
      )
    ).rows;
    assert.equal(discoveries.length, 1);
    assert.equal(discoveries[0].firstScanId, valid);
    assert.equal(discoveries[0].historical, true);
    assert.equal(
      (await client.query('SELECT count(*)::int AS n FROM xp_transactions'))
        .rows[0].n,
      0,
    );
    assert.equal(
      (await client.query('SELECT count(*)::int AS n FROM waste_items')).rows[0]
        .n,
      18,
    );
    result.checks.contentScanFavoritePreservation = true;
    result.checks.historicalDiscoveryNoRetroactiveXP = true;
    deployThrough(folders.at(-1));
    const beforeReplay = (
      await client.query('SELECT count(*)::int AS n FROM _prisma_migrations')
    ).rows[0].n;
    deployThrough(folders.at(-1));
    assert.equal(
      (await client.query('SELECT count(*)::int AS n FROM _prisma_migrations'))
        .rows[0].n,
      beforeReplay,
    );
    const records = (
      await client.query(
        'SELECT migration_name,checksum,finished_at FROM _prisma_migrations ORDER BY migration_name',
      )
    ).rows;
    for (const row of records) {
      assert(row.finished_at);
      assert.equal(
        row.checksum,
        createHash('sha256')
          .update(
            readFileSync(
              join(
                root,
                'prisma/migrations',
                row.migration_name,
                'migration.sql',
              ),
            ),
          )
          .digest('hex'),
      );
    }
    result.migrations = records.map((r) => r.migration_name);
    result.checks.deployReplayNoOpAndChecksums = true;
    execFileSync(
      join(root, 'node_modules/.bin/prisma'),
      [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        join(root, 'prisma/schema.prisma'),
        '--exit-code',
        '--config',
        config,
      ],
      {
        cwd: root,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: target.toString() },
      },
    );
    result.checks.finalSchemaMatchesPrisma = true;
    result.constraints = (
      await client.query(
        "SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND (conname LIKE 'xp_%' OR conname LIKE 'challenge_%' OR conname LIKE 'gamification_%' OR conname LIKE 'otps_%') ORDER BY conname",
      )
    ).rows.map((r) => r.conname);
    result.indexes = (
      await client.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('xp_transactions','waste_discoveries','user_challenge_progress','scan_analyses') ORDER BY indexname",
      )
    ).rows.map((r) => r.indexname);
    result.timezone = (await client.query('SHOW timezone')).rows[0].TimeZone;
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n', {
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        status: 'PASS',
        database: name,
        output,
        checks: result.checks,
        migrationCount: records.length,
      }),
    );
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    'Migration rehearsal FAILED. No database was reset/dropped; inspect isolated test state privately.',
  );
  process.exitCode = 1;
});
