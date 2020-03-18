const { path: appRootPath } = require("app-root-path");
require("dotenv").config({ path: require("path").join(appRootPath, ".env") });
const { Pool } = require("pg");

const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

const pool = new Pool({
    connectionString,
    ssl: false,
    idleTimeoutMillis: 1000
});

const getClient = () => pool.connect();

const query = (text, params) => pool.query(text, params);

const searchCatalog = async searchPhrase => {
    const { rows } = await query(
        "select book_details from search_catalog($1)",
        [searchPhrase]
    );
    const results = rows.map(row => row.book_details);
    return results;
};

module.exports = {
    query,
    searchCatalog,
    getClient
};
