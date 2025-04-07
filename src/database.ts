import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.DATABASE_URL)
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





    await pool.query(`
      CREATE TABLE IF NOT EXISTS option (
        id SERIAL PRIMARY KEY,
        question_id INT NOT NULL,
        option_text VARCHAR(255) NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
      );
    `);
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
            is_correct BOOLEAN NOT NULL,
                option_id INTEGER REFERENCES option(id), -- Optional option reference

            submitted_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (user_id, test_id, question_id),
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

    // await pool.query(`ALTER TABLE question
    //    ADD COLUMN image TEXT; ` 
    //   );

  
    








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
