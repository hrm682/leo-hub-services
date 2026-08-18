UPDATE public.products
SET category_id = '761168f9-268b-4fc9-985a-d9709274b6d7'
WHERE is_active = false AND category_id <> '761168f9-268b-4fc9-985a-d9709274b6d7';

DELETE FROM public.categories c
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id);