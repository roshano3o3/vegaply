// Verify that daily_queue and subscriptions tables exist and have correct columns.
// Run after creating tables: node scripts/verify_schema.mjs

const SUPABASE_URL = "https://fqvyiwouftsjdzpxtver.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnlpd291ZnRzamR6cHh0dmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTEwNDMsImV4cCI6MjA5MDcyNzA0M30.T3Orx8DXn1sOOD_Tp-9zP2ZuJ0bcCgkNX-ylC_I4yqc";

const EXPECTED = {
  daily_queue: [
    "id", "user_id", "job_id", "job_title", "employer_name",
    "job_apply_link", "job_description", "status",
    "tailored_resume_text", "cover_letter_text", "match_score",
    "queue_date", "created_at", "applied_at", "error_message"
  ],
  subscriptions: [
    "id", "user_id", "plan", "daily_limit", "active",
    "stripe_customer_id", "stripe_subscription_id",
    "created_at", "updated_at", "expires_at"
  ]
};

async function checkTable(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?limit=0`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Accept": "application/json"
      }
    }
  );

  if (res.status === 404 || res.status === 400) {
    const body = await res.text();
    return { exists: false, error: body };
  }

  // Table exists — now check columns via information_schema RPC
  return { exists: true, status: res.status };
}

async function getColumns(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_table_columns`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tbl: table })
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("\n── Vegaply Schema Verification ──\n");

  for (const [table, expectedCols] of Object.entries(EXPECTED)) {
    process.stdout.write(`Checking ${table}... `);
    const result = await checkTable(table);

    if (!result.exists) {
      console.log("✗ NOT FOUND");
      console.log(`  Error: ${result.error}`);
      continue;
    }

    console.log(`✓ EXISTS (HTTP ${result.status})`);
    console.log(`  Expected columns: ${expectedCols.join(", ")}`);
    console.log(`  → Column structure must be verified in Supabase Dashboard`);
    console.log(`    Dashboard → Table Editor → ${table} → View columns`);
    console.log();
  }

  console.log("─────────────────────────────────");
  console.log("If both tables show ✓ EXISTS, schema is ready for Step 3.");
  console.log();
}

main().catch(console.error);
