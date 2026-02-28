ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are publicly readable"
    ON courses FOR SELECT
    USING (true);
