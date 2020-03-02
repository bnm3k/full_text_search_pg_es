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

dir.readFiles(
    rdfdirpath,
    options,
    function(err, content, next) {
        if (err) throw err;
        const doc = parseRDF(content);
        const docJSON = JSON.stringify(doc);
        db.query(
            "insert into books(details) values ($1) returning 't'::boolean",
            [docJSON]
        )
            .then(() => next())
            .catch(err => next(err));
    },
    function(err) {
        if (err) throw err;
        console.log("done inserting to postgres");
    }
);
