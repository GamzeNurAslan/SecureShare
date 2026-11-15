BEGIN;

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE files
    ADD COLUMN IF NOT EXISTS folder_id UUID
    REFERENCES folders(id)
    ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_root_folder_name
    ON folders(owner_id, name)
    WHERE parent_folder_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_child_folder_name
    ON folders(owner_id, parent_folder_id, name)
    WHERE parent_folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_folders_owner_parent
    ON folders(owner_id, parent_folder_id);

CREATE INDEX IF NOT EXISTS idx_files_folder_id
    ON files(folder_id);

COMMIT;