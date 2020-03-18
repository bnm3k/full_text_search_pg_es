"use strict";
const { path: appRootPath } = require("app-root-path");
require("dotenv").config({ path: require("path").join(appRootPath, ".env") });
const request = require("request");
const program = require("commander");
const pg = require("./lib/pg");
const Table = require("cli-table");

program
    .version("0.0.1")
    .description(
        "search tool for project gutenberg book details using elasticsearch"
    )
    .usage("[options] <command> [...]")
    .requiredOption(
        "-d, --db [database]",
        "set db for search, either pg or es"
    );

const searchPG = async searchPhrase => {
    const res = await pg.query("select book_details from search_catalog($1)", [
        searchPhrase
    ]);
    const hits = res.rows.map(row => row.book_details);
    return hits;
};

const searchES = searchPhrase =>
    new Promise((resolve, reject) => {
        const { ESHOST, ESPORT } = process.env;
        const path = "_search";
        const options = {
            url: `http://${ESHOST}:${ESPORT}/${path.replace(/^\/*/, "")}`,
            json: true,
            qs: { q: searchPhrase }
        };
        request(options, (err, res, body) => {
            if (err) return reject(err);
            const hits = body.hits.hits.map(h => ({ ...h._source }));
            resolve(hits);
        });
    });

const hitsToTable = hits => {
    const table = new Table({
        head: ["id", "title", "authors"],
        colWidths: [7, 55, 15]
    });
    hits.forEach(h => table.push([h.id, h.title, h.authors]));
    return table;
};

const search = async (db, searchPhrase) => {
    const format = h => ({
        id: h.id,
        title: `${h.title.slice(0, 50).replace(/[;\r\n]+/g, ";")}${
            h.title.length > 50 ? "..." : ""
        }`,
        authors: `${h.authors.map(a => a.split(",")[0]).slice(0, 3)}`
    });
    const start = Date.now();
    let hits;
    if (db === "pg") hits = await searchPG(searchPhrase);
    else if (db === "es") hits = await searchES(searchPhrase);
    else throw new Error(`Invalid db option ${db}, select either pg or es`);
    const stop = Date.now();
    const hitsTable = hitsToTable(hits.map(format));
    console.log(hitsTable.toString());
    console.log(`Time Taken: ${stop - start} ms`);
};

//SEARCH
program
    .command("query [queries...]")
    .alias("q")
    .description("perform search query")
    .action(async (queries = []) => {
        await search(program.db, queries.join(" "));
    });

const main = async () => {
    await program.parseAsync(process.argv);
};

main().catch(err => console.error(err));
