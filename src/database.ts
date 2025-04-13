import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        status SMALLINT NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subject (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        status SMALLINT NOT NULL
      );
    `);

    // Check if 'course_id' column exists and add if missing
    let columnExists = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'subject' AND column_name = 'course_id';
    `);

    if (columnExists.rowCount === 0) {
      // Add column
      await pool.query(`
        ALTER TABLE subject
        ADD COLUMN course_id INTEGER;
      `);

      // Add foreign key constraint
      await pool.query(`
        ALTER TABLE subject
        ADD CONSTRAINT fk_course
        FOREIGN KEY (course_id)
        REFERENCES course(id)
        ON DELETE CASCADE;
      `);

    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) CHECK (type IN ('radio', 'blank', 'multiple_choice', 'text')) NOT NULL,
        status SMALLINT NOT NULL,
        subject_id INT NOT NULL,
        image TEXT,
        FOREIGN KEY (subject_id) REFERENCES subject(id) ON DELETE CASCADE
      );
    `);

    

    // Check if column "course_id" exists in "question" table
    columnExists = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'question' AND column_name = 'course_id';
    `);

    // Check if foreign key constraint exists
    let constraintCheck = await pool.query(`
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'question' AND constraint_name = 'fk_course_question';
    `);

    // Add column and foreign key constraint if missing
    if (columnExists.rowCount === 0) {
      await pool.query(`
        ALTER TABLE question
        ADD COLUMN course_id INTEGER;
      `);
      console.log("✅ Added column 'course_id' to 'question' table.");
    }

    if (constraintCheck.rowCount === 0) {
      await pool.query(`
        ALTER TABLE question
        ADD CONSTRAINT fk_course_question
        FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE;
      `);
      console.log("✅ Added foreign key constraint 'fk_course_question'.");
    }

    // Drop subject_id and its constraint if still present
    const subjectColCheck = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'question' AND column_name = 'subject_id';
    `);

    if ((subjectColCheck.rowCount ?? 0) > 0) {
      await pool.query(`
        ALTER TABLE question
        DROP CONSTRAINT IF EXISTS question_subject_id_fkey,
        DROP COLUMN subject_id;
      `);
      console.log("🗑️ Removed 'subject_id' column and constraint from 'question' table.");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS option (
        id SERIAL PRIMARY KEY,
        question_id INT NOT NULL,
        option_text VARCHAR(255) NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
      );
    `);

    // Check if the 'image' column exists in the 'option' table
    columnExists = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'option' AND column_name = 'image';
    `);

    if (columnExists.rowCount === 0) {
      // Add the 'image' column to the 'option' table
      await pool.query(`
        ALTER TABLE option
        ADD COLUMN image TEXT;
      `);
      console.log("✅ 'image' column added to 'option' table.");
    } else {
      console.log("✅ 'image' column already exists in 'option' table.");
    }


    const columnExistsTotalmarks = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'question' AND column_name = 'total_marks';
    `);
    
    // Add the 'total_marks' column if it doesn't exist
    if (columnExistsTotalmarks.rowCount === 0) {
      await pool.query(`
        ALTER TABLE question
        ADD COLUMN total_marks INTEGER;
      `);
      console.log("✅ Added column 'total_marks' to 'question' table.");
    }
    
    let constraintCheckcolumnExistsTotalmarks = await pool.query(`
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'question' AND constraint_name = 'fk_total_marks_question';
    `);

    const columnExistsnegative_marks = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'question' AND column_name = 'negative_marks';
    `);
    
    if (columnExistsnegative_marks.rowCount === 0) {
      await pool.query(`
        ALTER TABLE question
        ADD COLUMN negative_marks INTEGER; -- or the correct type for this column
      `);
    } else {
     
    }
    
    
    

    // Continue with other table creation statements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        duration INT NOT NULL,
        subject_id INT NOT NULL,
        start_date BIGINT NOT NULL,  -- Unix timestamp
        end_date BIGINT NOT NULL,    -- Unix timestamp
        created_at BIGINT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INT NOT NULL,
        question_id INT NOT NULL,
        FOREIGN KEY (test_id) REFERENCES test(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
        UNIQUE (test_id, question_id)
      );
    `);

    // Your other table creation queries here...
  } catch (error) {
    console.error("Error creating users table:", error);
  }
};

// Ensure the table is created on startup
createUsersTable();

pool.on("connect", () => {
  console.log("Connected to the database");
});

pool.on("error", (err) => {
  console.error("Unexpected database error", err);
});

export default pool;
