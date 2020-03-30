Though not all titles are English, for simplicity, the English dictionary is used to index the titles
One assumption made is that all titles are in English, so that the standard English dictionary is used.

It is quite probable that some authors share the same name. However, since Project Gutenberg does not provide author ids so as to differentiate them, I've errenously assumed that each author name is unique

First, the default dictionary is set to english:

```sql
alter database project_gutenberg
set default_text_search_config = 'pg_catalog.english';
```

Setting the search fields, use a combination of CTEs for readability and an update join. Since not all books have authors listed, a left join is used. With both the left join and some books not having a subject list, `coalesce` is used to prevent nulls bubbling up into the search field.

```sql
with authors as (
    select
        book_id,
        array_agg(author_name) author_names
    from book_to_author
    join author using(author_id)
    group by book_id
), search_vecs as (
    select
        book_id,
        setweight(to_tsvector('english', title),'A') ||
        setweight(to_tsvector('simple', array_to_string(coalesce(author_names, '{}'::text[]), ', ')),'A') ||
        setweight(to_tsvector('english', array_to_string(coalesce(subjects, '{}'::text[]), ', ')),'D')
            as vec
    from book_detail
    left join authors using(book_id)
)
update book_detail
    set search = search_vecs.vec
from search_vecs
where book_detail.book_id = search_vecs.book_id;
```

The search query, eg searching for Dostoyevsky

```sql
select
    book_id,
    substring(title, 1, 30) as title,
    authors,
    ts_rank(search, ts.query)::numeric(10,3) as r
from
    (select websearch_to_tsquery('english','Dostoyevsky')||websearch_to_tsquery('simple','Dostoyevsky') as query) as ts,
book_detail
left join (
    select book_id, array_agg(substring(author_name,1,5)) authors
    from book_to_author join author using(author_id)
    group by book_id
) a using(book_id)
where search @@ ts.query
order by r desc;
```

# OPTIMIZING

Since I'm comparing with elasticsearch, the one stark difference I've noticed is that postgres takes way way much longer

There are some low-hanging fruits to grab before getting into more complex performance tuning. The first simple optimization is to make sure Postgres is taking full advantage of the hardware available, as per the application's requirement. Without dwelling too much on it, I'll simply rely on [pg_tune's](https://pgtune.leopard.in.ua/#/) suggestions. On restarting the database with the settings provided.

TODO:

RESOURCES

-   pgTune: https://pgtune.leopard.in.ua/#/
-   pgDocs: using explain - https://www.postgresql.org/docs/9.5/using-explain.html
-   Reading a Postgres EXPLAIN ANALYZE Query Plan: https://thoughtbot.com/blog/reading-an-explain-analyze-query-plan
-   What each field means in an explain execution: https://www.pgmustard.com/blog/2019/9/17/postgres-execution-plans-field-glossary
-   online explain analyzer: https://explain.depesz.com/
-   Another online explain analyzer: http://tatiyants.com/pev/#/plans/new
-   RUM index: https://postgrespro.com/docs/enterprise/9.6/rum
-   Advanced Postgres Performance Tips: https://thoughtbot.com/blog/advanced-postgres-performance-tips
-   What are index types and why you need them: https://hub.packtpub.com/6-index-types-in-postgresql-10-you-should-know/
