ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_roles text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_work_arrangement text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_employment_types text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_easy_apply_only boolean DEFAULT false;
