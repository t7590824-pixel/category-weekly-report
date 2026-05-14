import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

await conn.execute("DROP TABLE IF EXISTS `skc_monthly_data`");
await conn.execute(`
  CREATE TABLE \`skc_monthly_data\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`country\` varchar(10) NOT NULL,
    \`business_year_and_week\` varchar(20) NOT NULL,
    \`skc\` varchar(64) NOT NULL,
    \`second_category\` varchar(64),
    \`third_category\` varchar(64),
    \`first_list_date\` varchar(32),
    \`occasion\` varchar(64),
    \`first_second_color\` varchar(32),
    \`sales\` double,
    \`qty\` double,
    \`collection_exposure\` double,
    \`collection_click\` double,
    \`pdp_exposure\` double,
    \`add_cart\` double,
    \`checkout\` double,
    \`on_shelf_days\` int,
    \`on_shelf_range\` varchar(32),
    \`new_old_flag\` varchar(16),
    \`created_at\` timestamp NOT NULL DEFAULT (now()),
    INDEX \`idx_period_country\` (\`business_year_and_week\`, \`country\`),
    CONSTRAINT \`skc_monthly_data_id\` PRIMARY KEY(\`id\`)
  )
`);

console.log("Table skc_monthly_data recreated OK");
await conn.end();
