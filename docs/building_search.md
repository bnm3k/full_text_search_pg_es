Though not all titles are English, for simplicity, the English dictionary is used to index the titles
One assumption made is that all titles are in English, so that the standard English dictionary is used.

It is quite probable that some authors share the same name. However, since Project Gutenberg does not provide author ids so as to differentiate them, I've errenously assumed that each author name is unique



First, the default dictionary is set to english:

```sql
alter database project_gutenberg
set default_text_search_config = 'pg_catalog.english';
```



Setting the search fields, use a combination of CTEs for readability and an update join. Since not all books have authors listed, a left join is used. With both the left join and some books not having a subject list,  `coalesce` is used to prevent nulls bubbling up into the search field.

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
