"use strict";
const { path: appRootPath } = require("app-root-path");
const path = require("path");
const dir = require("node-dir");
const { parseRDF } = require("../lib/parseRDF");
const db = require("../lib/pg");

const rdfdirpath =
    process.argv[2] || path.resolve(appRootPath, "data/cache/epub/");

const options = {
    match: /\.rdf$/, // match: /pg1.\.rdf$/,
    exclude: ["pg0.rdf"]
};

const insertBookMetadata = client => {
    return new Promise((resolve, reject) => {
        dir.readFiles(
            rdfdirpath,
            options,
            function(err, content, next) {
                if (err) return reject(err);
                const doc = parseRDF(content);
                const docJSON = JSON.stringify(doc);
                client
                    .query(
                        "insert into books(details) values ($1) returning 't'::boolean",
                        [docJSON]
                    )
                    .then(() => next())
                    .catch(reject);
            },
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

const main = async () => {
    const client = await db.getClient();
    try {
        await client.query("begin");
        const res = await insertBookMetadata(client);
        await client.query("commit");
        console.log(
            `Completed insertion of Project Gutenberg book metadata to Postgres`
        );
    } catch (err) {
        await client.query("rollback");
        console.error(err);
    } finally {
        process.exit();
    }
};

main().catch(err => {
    console.error(err);
});
