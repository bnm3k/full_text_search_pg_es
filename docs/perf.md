With the search all set up, the first order of business is to compare the speed of Postgres Full Text Search relative to Elasticsearch.
The longer the phrase for search, the longer Postgres takes to return a result whereas Elasticsearch seems to take roughly the same amount of time regardless of how long the phrase supplied is.

On average, Postgres takes 7.24 longer than elasticsearch to complete a search a query. Before, dismissing Postgres, this should be expected, since I haven't added any optimizations.

Before adding indexes, one low-hanging fruit I can grab is configuring Postgres to take better advantage of the system.
For this, I relied on pgTune's recommendation. After applying the suggested configurations,and restarting Postgres, there really wasn't much of an improvement in terms of speed and in most of the cases, Postgres took longer by 4ms to 8ms. However, some of the configurations such as on `work_mem` should come in handy when using an index whose performance improves with such tweaks.

As already hinted, the next step is, well, adding an index on the search column. As things stand, Postgres has to perform a sequential scan on the entire `book` table for every given search.

* GIN index

```sql
create index idx_book_details_searchable_gin
    on book
    using GIN(search);
```

For the `search` column, the two basic index options are `GiST` and `GIN`. I'll be using `GIN`. Compared to `GiST`, GIN is lossless and faster for search. However, `GIN` takes up more space and has slower inserts. Since the underlying dataset isn't that huge and is rarely/periodically updated, the shortcomings of using `GIN`  shouldn't be of much concern.

On adding the index, Postgres gets way way faster than Elasticsearch - 2.84 times faster. Of course, this comes with a caveat - Elasticsearch is being run as is without any further configurations.

Another type of index that could be used in leau of GIN is the RUM index. RUM indexes are more specialized for full-text search, supporting ranking directly from the index, and having the ability to store extra relevant data e.g. if the book publishing date was to be used for ordering results.

After installing and adding the extension to the database, the index is added as follows:

```sql
drop index idx_book_details_searchable_gin;
create index idx_book_details_searchable_rum
    on book
    using RUM(search rum_tsvector_ops);
```

My current workload doesn't take full advantage of the RUM index, so the performance again is quite slight, shaving off just a few milliseconds. For a more indepth undertaking of workloads where RUM indexes add greater performance gains (compared to GIN indexes), check out the following post: ["Postgresql Search: From the trenches"](https://blog.soykaf.com/post/postgresl-front-report/).
