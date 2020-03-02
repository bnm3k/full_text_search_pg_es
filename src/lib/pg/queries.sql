/*
explain
    select details from books
    where details @> '{"id": 12}' 
    limit 1;

--vs

explain
    select details from books
    where details->>'id'='12'
    limit 1;

--vs

explain
    select details from books 
    where details->'id'='12' limit 1;
*/


-- select 
--     regexp_replace(results.details->>'title','\r?\n|\r','; ') as title,
--     rank as title
-- from search_books('Calculus') results
-- where rank > 0 limit 10;