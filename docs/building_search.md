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





# MULTI-PHRASE SEARCH

So far Postgres works well enough - with indexing, it's faster than Elasticsearch and for simple queries, its results are satisfactory. However, on multi-phrase queries, Postgres (as I had set it up so far), performs quite poorly. For example, when searching for books on 'american civil war alabama', Postgres returns zero results - at least Elasticsearch returns the following results:

```
* Civil War and Reconstruction in Alabama - Fleming
* Stonewall Jackson and the American Civil War - Wolseley, Hen...
* Great Britain and the American Civil War - Adams
* Makers and Romans of Alabama History - Riley

... ETC
 
```



My first solution was to have a separate procedure that relied on trigrams for search in case full-text search didn't return any results. Without getting too much into the step-by-step details, it entailed building a GiST trigram index over the combined relevant text. Needless to say, it didn't work as expected - for example, for the above query, it too returned zero results.



Going back to the root problem, the reason why Postgres' full-text search did not return any results for the above query was because its criteria (as I had set it up) for matching documents was too strict i.e. it would only return results that matched all 4 words, 'american', 'civil', 'war', 'alabama'. This is seen as follows:

```sql
select websearch_to_tsquery('american civil war alabama');            websearch_to_tsquery            ════════════════════════════════════════════ 
'american' & 'civil' & 'war' & 'alamabama'
```



The technical user, knowing that the search script is using `websearch_to_tsquery` at its core, could utilize operators to 'loosen' the fts matching if, on first attempt, it did not return the expected number of results. However, a better user-experience is to make it such that non-technical users can also retrieve a wider-array of results on first attempt, just like in Elastichsearch. As such, my next solution was to automatically insert 'or' operators between each word to make matching less strict:

```sql
select
    details,
    ts_rank(search, ts.query)::numeric(10,3) as relevance
from
    (select  
        websearch_to_tsquery('english','american civil war alabama') ||
        websearch_to_tsquery('simple','american civil war alabama') ||
        websearch_to_tsquery('simple', replace('american civil war alabama', ' ', ' or ')) query
    ) as ts,
    book 
where book.search @@ ts.query
order by relevance desc limit 10;
```

And now, at least I was getting some results back, some of which seemed relevant to the query

```
* The Black Phalanx African American soldiers in the War of Independence, the War of 1812, and the Civil War - Wilson
* The Little Regiment, and Other Episodes of the American Civil War - Crane
* Civil War and Reconstruction in Alabama - Fleming
* With Lee in Virginia: A Story of the American Civil War - Henty
```

The only shortcoming so far, is that Postgres is now slightly slower than Elasticsearch on queries with mutliple words - it's still faster on queries with one or two or three words though but beyond that Elasticsearch takes the cake. Still, I'm not quite satisfied with my solution for multiphrase search and I'll keep on searching for better and more efficient alternatives.



TODO:

RESOURCES

- pgTune: https://pgtune.leopard.in.ua/#/
- pgDocs: using explain - https://www.postgresql.org/docs/9.5/using-explain.html
- Reading a Postgres EXPLAIN ANALYZE Query Plan: https://thoughtbot.com/blog/reading-an-explain-analyze-query-plan
- What each field means in an explain execution: https://www.pgmustard.com/blog/2019/9/17/postgres-execution-plans-field-glossary
- online explain analyzer: https://explain.depesz.com/
- Another online explain analyzer: http://tatiyants.com/pev/#/plans/new
- RUM index: https://postgrespro.com/docs/enterprise/9.6/rum
- Advanced Postgres Performance Tips: https://thoughtbot.com/blog/advanced-postgres-performance-tips
- What are index types and why you need them: https://hub.packtpub.com/6-index-types-in-postgresql-10-you-should-know/
