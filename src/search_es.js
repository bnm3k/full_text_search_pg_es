"use strict";
const request = require("request");
const program = require("commander");

const fullUrl = (path = "") => {
    let url = `http://${program.host}:${program.port}/`;
    if (program.index) {
        url += program.index + "/";
        if (program.type) {
            url += program.type + "/";
        }
    }
    return url + path.replace(/^\/*/, "");
};

//http://localhost:9200/books/book/ for posting books

const handleResponse = (err, res, body) => {
    if (program.json) console.log(JSON.stringify(err || body));
    else {
        if (err) throw err;
        console.log(body);
    }
};

program
    .version("0.0.1")
    .description(
        "search tool for project gutenberg book details using elasticsearch"
    )
    .usage("[options] <command> [...]")
    .option("-o, --host <hostname>", "hostname [localhost]", "localhost")
    .option("-p, --port <number>", "port number [9200]", "9200")
    .option("-j, --json", "format output as JSON")
    .option("-i, --index <name>", "which index to use")
    .option("-f, --filter <filter>", "source filter for query results");

program
    .command("url [path]")
    .description("generate the URL for the options and path (default /) ")
    .action((path = "/") => {
        console.log(fullUrl(path));
    });

//GET
program
    .command("get [path]")
    .description("perform a http Get request for given path (default /)")
    .action((path = "/") => {
        const opts = {
            url: fullUrl(path),
            json: program.json
        };
        request(opts, handleResponse);
    });

//LIST INDICES
program
    .command("list-indices")
    .alias("li")
    .description("list indices in elasticsearch cluster")
    .action(() => {
        const path = program.json ? "_all" : "_cat/indices?v";
        request({ url: fullUrl(path), json: program.json }, handleResponse);
    });

//SEARCH
program
    .command("query [queries...]")
    .alias("q")
    .description("perform elastic search query")
    .action((queries = []) => {
        const options = {
            url: fullUrl("_search"),
            json: program.json,
            qs: {}
        };
        if (queries && queries.length) {
            options.qs.q = queries.join(" ");
        }
        if (program.filter) {
            options.qs._source = program.filter;
        }

        request(options, handleResponse);
    });

program.parse(process.argv);
