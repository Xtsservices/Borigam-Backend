import express from 'express';
import cors from "cors";

import dotenv from 'dotenv';
 import userRouter from './routes/userRoutes';
 import roleRouter from './routes/roleRoutes';
 import courseRouter from './routes/course';



import pool from './database';
import { errorHandlingMiddleware } from './common/joiValidations/errorhandler'; 
import { ErrorRequestHandler } from 'express';

dotenv.config();



const app = express();
app.use(cors());


app.use(express.json());
 app.use('/api/users', userRouter);
 app.use('/api/roles', roleRouter);
 app.use('/api/course', courseRouter);







const PORT = process.env.PORT || 3001;
app.use(cors({
  origin: "http://localhost:3000",  // Replace with your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true  // Allow cookies
}))
// Regular middleware

app.use(errorHandlingMiddleware as ErrorRequestHandler);

// DbConnection();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// async function DbConnection() {
//   try {
//     const client = await pool.connect();
//     console.log('Database connected successfully');
//     client.release();
//   } catch (error) {
//     console.error('Database connection failed:', error);
//   }
// }

