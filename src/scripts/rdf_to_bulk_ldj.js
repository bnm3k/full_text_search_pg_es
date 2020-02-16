"use strict";
const { path: appRootPath } = require("app-root-path");
const path = require("path");
const dir = require("node-dir");
const fs = require("fs");
const { parseRDF } = require("../utils/parseRDF");

const fileLDJElasticsearch = fs.createWriteStream(
    path.join(appRootPath, "data/bulk_es.ldj")
);

const rdfdirpath =
    process.argv[2] || path.resolve(appRootPath, "data/cache/epub/");

const options = {
    match: /\.rdf$/,
    exclude: ["pg0.rdf"]
};

dir.readFiles(
    rdfdirpath,
    options,
    function(err, content, next) {
        if (err) throw err;
        const doc = parseRDF(content);
        const esAction = { index: { _id: `pg${doc.id}` } };
        fileLDJElasticsearch.write(
            `${JSON.stringify(esAction)}\n${JSON.stringify(doc)}\n`
        );
        next();
    },
    function(err) {
        if (err) throw err;
        console.log(
            "complete conversion of rdf to ldf for elasticsearch bulk insert"
        );
        fileLDJElasticsearch.close();
    }
);
