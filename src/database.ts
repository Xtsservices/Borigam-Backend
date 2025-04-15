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

    await pool.query(`
      DO $$
      BEGIN
        -- Drop subject_id column if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test' AND column_name='subject_id'
        ) THEN
          ALTER TABLE test
          DROP COLUMN subject_id;
        END IF;
    
        -- Add course_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='test' AND column_name='course_id'
        ) THEN
          ALTER TABLE test
          ADD COLUMN course_id INTEGER;
        END IF;
    
        -- Add foreign key constraint on course_id if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name='test' AND constraint_type='FOREIGN KEY' AND constraint_name='fk_course_test'
        ) THEN
          ALTER TABLE test
          ADD CONSTRAINT fk_course_test
          FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);


  await pool.query(`
      CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  test_id INT NOT NULL,
  total_questions INT NOT NULL,
  attempted INT NOT NULL,
  correct INT NOT NULL,
  wrong INT NOT NULL,
  final_score DECIMAL(5,2) NOT NULL,
  final_result VARCHAR(10) CHECK (final_result IN ('Pass', 'Fail')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES test(id) ON DELETE CASCADE,
  UNIQUE (user_id, test_id)
);

  `);
  


await pool.query(`
  CREATE TABLE IF NOT EXISTS role (
   id SERIAL PRIMARY KEY,
   name VARCHAR(255) UNIQUE NOT NULL,
   status SMALLINT NOT NULL
 );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS college (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status SMALLINT NOT NULL
  );
`);



await pool.query(`
CREATE TABLE IF NOT EXISTS users (
id SERIAL PRIMARY KEY,
firstname VARCHAR(100) NOT NULL,
lastname VARCHAR(100) NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
countrycode VARCHAR(10) NOT NULL,
mobileno VARCHAR(20) UNIQUE NOT NULL,
status SMALLINT NOT NULL
);
`);
 await pool.query(`
CREATE TABLE IF NOT EXISTS batch (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
course_id INT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
start_date BIGINT NOT NULL,
end_date BIGINT NOT NULL,
status VARCHAR(50) NOT NULL DEFAULT 'active',
college_id INT REFERENCES college(id) ON DELETE SET NULL
);
`);



await pool.query(`
  CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id)  -- Ensures uniqueness of user-role pairs
);


`);

await pool.query(`
    CREATE TABLE IF NOT EXISTS login (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100)  NOT NULL
    );
  `);

await pool.query(`
    CREATE TABLE IF NOT EXISTS college_users (
      college_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (college_id, user_id),
      FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

await pool.query(`
    CREATE TABLE IF NOT EXISTS college_students (
      college_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (college_id, user_id),
      FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

await pool.query(`
   CREATE TABLE IF NOT EXISTS test_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    option_id INTEGER REFERENCES option(id),
    text TEXT,
    is_correct BOOLEAN NOT NULL,
    status TEXT DEFAULT 'unanswered',
    submitted_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_user_test_question_option
    UNIQUE (user_id, test_id, question_id, option_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES test(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
);

`);

await pool.query(`
    CREATE TABLE IF NOT EXISTS test_results (
id SERIAL PRIMARY KEY,
user_id INT NOT NULL,
test_id INT NOT NULL,
total_questions INT NOT NULL,
attempted INT NOT NULL,
correct INT NOT NULL,
wrong INT NOT NULL,
final_score DECIMAL(5,2) NOT NULL,
final_result VARCHAR(10) CHECK (final_result IN ('Pass', 'Fail')) NOT NULL,
created_at TIMESTAMP DEFAULT NOW(),
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (test_id) REFERENCES test(id) ON DELETE CASCADE,
UNIQUE (user_id, test_id)
);

`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS course_students (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
      batch_id INT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      start_date BIGINT NOT NULL,
      end_date BIGINT
  );
`);
await pool.query(`
CREATE TABLE IF NOT EXISTS test_batches (
  id SERIAL PRIMARY KEY,
  test_id INT NOT NULL ,
  batch_id INT NOT NULL ,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) -- store as Unix timestamp
);
 

  ` 
);

// const checkStatusColumn = await pool.query(`
//   SELECT 1
//   FROM information_schema.columns
//   WHERE table_name = 'test_submissions' AND column_name = 'status';
// `);

// if (checkStatusColumn.rowCount === 0) {
//   await pool.query(`
//     ALTER TABLE test_submissions
//     ADD COLUMN status VARCHAR(20) DEFAULT 'open';
//   `);
//   console.log("✅ Added 'status' column to 'test_submissions' table.");
// }

const checkStartTimeColumn = await pool.query(`
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'test_results' AND column_name = 'start_time';
`);

if (checkStartTimeColumn.rowCount === 0) {
  await pool.query(`
    ALTER TABLE test_results
    ADD COLUMN start_time BIGINT;
  `);
  console.log("✅ Added 'start_time' column to 'test_results' table.");
}

const columnTypeCheck = await pool.query(`
  SELECT data_type
  FROM information_schema.columns
  WHERE table_name = 'test_results' AND column_name = 'start_time';
`);

if (
  columnTypeCheck.rows.length > 0 &&
  columnTypeCheck.rows[0].data_type !== 'bigint'
) {
  // Convert timestamp to epoch (UNIX timestamp) and change column type to BIGINT
  await pool.query(`
    ALTER TABLE test_results
    ALTER COLUMN start_time TYPE BIGINT USING EXTRACT(EPOCH FROM start_time)::BIGINT;
  `);
}

await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN total_questions DROP NOT NULL;
`);

await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN attempted DROP NOT NULL;
`);

await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN correct DROP NOT NULL;
`);
await pool.query(`
  DO $$
BEGIN
    -- Check if the columns exist before adding them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'test_results' 
                   AND column_name = 'marks_awarded') THEN
        ALTER TABLE test_results
        ADD COLUMN marks_awarded DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'test_results' 
                   AND column_name = 'marks_deducted') THEN
        ALTER TABLE test_results
        ADD COLUMN marks_deducted DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'test_results' 
                   AND column_name = 'final_score') THEN
        ALTER TABLE test_results
        ADD COLUMN final_score DECIMAL(5, 2) DEFAULT 0;
    END IF;
END $$;

`);



// const constraintName = "unique_user_test_question_option";

// const constraintExistsQuery = `
//     SELECT 1
//     FROM information_schema.table_constraints
//     WHERE table_name = 'test_submissions'
//       AND constraint_name = $1;
// `;

// const result = await pool.query(constraintExistsQuery, [constraintName]);

// if (result.rowCount === 0) {
//     await pool.query(`
//         ALTER TABLE test_submissions
//         ADD CONSTRAINT ${constraintName}
//         UNIQUE (user_id, test_id, question_id, option_id);
//     `);
//     console.log("Constraint added successfully.");
// } else {
//     console.log("Constraint already exists. Skipping ALTER TABLE.");
// }

// await pool.query(`
//   ALTER TABLE test_submissions
//   DROP CONSTRAINT IF EXISTS test_submissions_user_id_test_id_question_id_key;
// `);




await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN wrong DROP NOT NULL;
`);

await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN final_score DROP NOT NULL;
`);

await pool.query(`
  ALTER TABLE test_results
  ALTER COLUMN final_result DROP NOT NULL;
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS module (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    status SMALLINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL,
    module_id INT NOT NULL,
    read_permission BOOLEAN DEFAULT FALSE,
    write_permission BOOLEAN DEFAULT FALSE,
    update_permission BOOLEAN DEFAULT FALSE,
    delete_permission BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES module(id) ON DELETE CASCADE,
    UNIQUE(role_id, module_id)
  );
`);

await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns 
      WHERE table_name='test_results' AND column_name='start_time'
    ) THEN
      ALTER TABLE test_results ADD COLUMN start_time BIGINT;
    END IF;
  END
  $$;
`);
await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_results' AND column_name = 'marks_awarded'
    ) THEN
      ALTER TABLE test_results ADD COLUMN marks_awarded NUMERIC;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_results' AND column_name = 'marks_deducted'
    ) THEN
      ALTER TABLE test_results ADD COLUMN marks_deducted NUMERIC;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_results' AND column_name = 'total_marks_awarded'
    ) THEN
      ALTER TABLE test_results ADD COLUMN total_marks_awarded NUMERIC;
    END IF;
  END
  $$;
`);

await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_submissions' AND column_name = 'marks_awarded'
    ) THEN
      ALTER TABLE test_submissions ADD COLUMN marks_awarded NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_submissions' AND column_name = 'marks_deducted'
    ) THEN
      ALTER TABLE test_submissions ADD COLUMN marks_deducted NUMERIC DEFAULT 0;
    END IF;
  END
  $$;
`);
await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'test_results' AND column_name = 'unattempted'
    ) THEN
      ALTER TABLE test_results ADD COLUMN unattempted INT DEFAULT 0;
    END IF;
  END
  $$;
`);
await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'question' AND column_name = 'correct_answer'
    ) THEN
      ALTER TABLE question ADD COLUMN correct_answer TEXT;
    END IF;
  END
  $$;
`);



const { rows } = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'test_submissions'
  AND column_name IN ('marks_awarded', 'marks_deducted');
`);

const isAlreadyFloat = rows.every(row => row.data_type === 'double precision'); // FLOAT in Postgres maps to double precision

if (!isAlreadyFloat) {
  await pool.query(`
    ALTER TABLE test_submissions
    ALTER COLUMN marks_awarded TYPE FLOAT,
    ALTER COLUMN marks_deducted TYPE FLOAT;
  `);
  console.log('Columns altered to FLOAT');
} else {
  console.log('Columns are already FLOAT');
}









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
