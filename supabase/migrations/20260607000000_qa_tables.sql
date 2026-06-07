-- Q&A / FAQ feature: categories + entries, multilingual, admin-write.
-- Public URL is /guide; tables use the qa_ prefix.

-- 1. Categories (sections such as "Getting Started", "PMG Grading")
CREATE TABLE IF NOT EXISTS public.qa_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  name_ar text,
  name_tr text,
  display_order integer NOT NULL DEFAULT 0,
  original_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Entries (each question / article)
CREATE TABLE IF NOT EXISTS public.qa_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES public.qa_categories(id) ON DELETE CASCADE,
  headline text NOT NULL,
  headline_en text,
  headline_ar text,
  headline_tr text,
  short_description text NOT NULL DEFAULT '',
  short_description_en text,
  short_description_ar text,
  short_description_tr text,
  content text NOT NULL DEFAULT '',
  content_en text,
  content_ar text,
  content_tr text,
  main_image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_draft boolean NOT NULL DEFAULT false,
  original_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_entries_category_id_idx ON public.qa_entries(category_id);

-- 3. RLS
ALTER TABLE public.qa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_entries ENABLE ROW LEVEL SECURITY;

-- Public read of categories.
DROP POLICY IF EXISTS "qa_categories public read" ON public.qa_categories;
CREATE POLICY "qa_categories public read"
  ON public.qa_categories FOR SELECT USING (true);

-- Admins manage categories.
DROP POLICY IF EXISTS "qa_categories admin write" ON public.qa_categories;
CREATE POLICY "qa_categories admin write"
  ON public.qa_categories FOR ALL
  USING (is_super_or_country_admin())
  WITH CHECK (is_super_or_country_admin());

-- Public read of published entries; admins read everything.
DROP POLICY IF EXISTS "qa_entries public read" ON public.qa_entries;
CREATE POLICY "qa_entries public read"
  ON public.qa_entries FOR SELECT
  USING (is_draft = false OR is_super_or_country_admin());

-- Admins manage entries.
DROP POLICY IF EXISTS "qa_entries admin write" ON public.qa_entries;
CREATE POLICY "qa_entries admin write"
  ON public.qa_entries FOR ALL
  USING (is_super_or_country_admin())
  WITH CHECK (is_super_or_country_admin());

-- 4. Seed: migrate the 3 existing guides into a "Getting Started" category.
DO $$
DECLARE
  cat_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.qa_categories WHERE name = 'Getting Started') THEN
    INSERT INTO public.qa_categories (name, name_en, display_order, original_language)
    VALUES ('Getting Started', 'Getting Started', 0, 'en')
    RETURNING id INTO cat_id;

    INSERT INTO public.qa_entries
      (category_id, headline, headline_en, short_description, short_description_en, content, content_en, display_order, original_language)
    VALUES
      (cat_id,
       'How to Add a Banknote to Your Collection',
       'How to Add a Banknote to Your Collection',
       'Browse the catalogues and add banknotes to your personal collection in a few clicks.',
       'Browse the catalogues and add banknotes to your personal collection in a few clicks.',
       '<ol><li><strong>Go to the Catalogues</strong> — From the top menu, click on "Catalogues".</li><li><strong>Choose a Country</strong> — Click on the country whose banknotes you want to view.</li><li><strong>Browse and Add Banknotes</strong> — Scroll through the list of banknotes. To add one to your collection, click the "+" icon on the top-right of the banknote card.</li><li><strong>Add More Banknotes</strong> — Repeat the process for every banknote you own. You can quickly add multiple this way.</li><li><strong>View Your Collection</strong> — Once you''re done, go to the "My Collection" section from the menu to see all the banknotes you''ve added.</li><li><strong>Remove a Mistaken Entry</strong> — If you added a banknote by mistake: click on that banknote in your collection, then click the trash icon to remove it.</li></ol>',
       '<ol><li><strong>Go to the Catalogues</strong> — From the top menu, click on "Catalogues".</li><li><strong>Choose a Country</strong> — Click on the country whose banknotes you want to view.</li><li><strong>Browse and Add Banknotes</strong> — Scroll through the list of banknotes. To add one to your collection, click the "+" icon on the top-right of the banknote card.</li><li><strong>Add More Banknotes</strong> — Repeat the process for every banknote you own. You can quickly add multiple this way.</li><li><strong>View Your Collection</strong> — Once you''re done, go to the "My Collection" section from the menu to see all the banknotes you''ve added.</li><li><strong>Remove a Mistaken Entry</strong> — If you added a banknote by mistake: click on that banknote in your collection, then click the trash icon to remove it.</li></ol>',
       0, 'en'),
      (cat_id,
       'How to Add Information or a Picture to a Banknote in Your Collection',
       'How to Add Information or a Picture to a Banknote in Your Collection',
       'Edit a banknote in your collection to add details, grade, or upload your own photos.',
       'Edit a banknote in your collection to add details, grade, or upload your own photos.',
       '<ol><li><strong>Open "My Collection"</strong> — From the top menu, click on "My Collection" to access your personal banknotes.</li><li><strong>Select a Country</strong> — Choose the country of the banknote you''d like to edit.</li><li><strong>Choose the Banknote</strong> — Scroll down and click on the banknote you want to update.</li><li><strong>Click the Edit Icon</strong> — In the banknote details page, click on the Edit icon (typically a pencil).</li><li><strong>Fill in the Details</strong> — A form will appear. You can add or update quantity, notes, grade, purchase source, or any other personal details.</li><li><strong>Click "Change Picture"</strong> — To upload or replace a photo, click the "Change Picture" button.</li><li><strong>Select Your Image</strong> — Choose a front or back image of the banknote from your device.</li><li><strong>Edit Image (Optional)</strong> — Adjust or crop the picture to fit the required display area, then click "Save".</li><li><strong>Click "Update Item"</strong> — Scroll to the bottom and click "Update Item" to apply the edits to your collection.</li></ol>',
       '<ol><li><strong>Open "My Collection"</strong> — From the top menu, click on "My Collection" to access your personal banknotes.</li><li><strong>Select a Country</strong> — Choose the country of the banknote you''d like to edit.</li><li><strong>Choose the Banknote</strong> — Scroll down and click on the banknote you want to update.</li><li><strong>Click the Edit Icon</strong> — In the banknote details page, click on the Edit icon (typically a pencil).</li><li><strong>Fill in the Details</strong> — A form will appear. You can add or update quantity, notes, grade, purchase source, or any other personal details.</li><li><strong>Click "Change Picture"</strong> — To upload or replace a photo, click the "Change Picture" button.</li><li><strong>Select Your Image</strong> — Choose a front or back image of the banknote from your device.</li><li><strong>Edit Image (Optional)</strong> — Adjust or crop the picture to fit the required display area, then click "Save".</li><li><strong>Click "Update Item"</strong> — Scroll to the bottom and click "Update Item" to apply the edits to your collection.</li></ol>',
       1, 'en'),
      (cat_id,
       'How to Suggest a Banknote Image to the Main Catalogues',
       'How to Suggest a Banknote Image to the Main Catalogues',
       'Submit your best banknote images to be featured in the main catalogues.',
       'Submit your best banknote images to be featured in the main catalogues.',
       '<ol><li><strong>Go to the Banknote Page</strong> — Navigate to the banknote page in your collection that contains the image you want to suggest.</li><li><strong>Click "Suggest to Catalogues"</strong> — Above your uploaded banknote image, click the "Suggest to Catalogues" button. This submits your image for review by an administrator.</li><li><strong>Wait for Review</strong> — Your suggestion will be reviewed by the site''s admin team. They may approve or reject your submission based on quality and clarity.</li><li><strong>Edit and Re-Suggest if Needed</strong> — If you edit or change the banknote image later, the system will allow you to suggest it again for catalogue inclusion.</li></ol><p><em>Note: Only the best-quality images are selected for the main catalogues. Admins may choose another user''s image if it''s better suited.</em></p>',
       '<ol><li><strong>Go to the Banknote Page</strong> — Navigate to the banknote page in your collection that contains the image you want to suggest.</li><li><strong>Click "Suggest to Catalogues"</strong> — Above your uploaded banknote image, click the "Suggest to Catalogues" button. This submits your image for review by an administrator.</li><li><strong>Wait for Review</strong> — Your suggestion will be reviewed by the site''s admin team. They may approve or reject your submission based on quality and clarity.</li><li><strong>Edit and Re-Suggest if Needed</strong> — If you edit or change the banknote image later, the system will allow you to suggest it again for catalogue inclusion.</li></ol><p><em>Note: Only the best-quality images are selected for the main catalogues. Admins may choose another user''s image if it''s better suited.</em></p>',
       2, 'en');
  END IF;
END $$;
