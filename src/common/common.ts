import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
import crypto from 'crypto'; // You can use crypto or any other method for generating random strings
import baseRepository from "../repo/baseRepo";

dotenv.config();

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            JWT_SECRET: string;
        }
    }
}




class common {


    async hashPassword(password: string) {

        try {

            const hashedPassword = await bcrypt.hash(password, 10);
            return hashedPassword

        } catch (error) {
            return error
        }



    }


    async comparePassword(password: string, hashPassword: string) {

        try {

            let result = await bcrypt.compare(password, hashPassword)
            return result

        } catch (error) {
            return error
        }



    }

    async generatetoken(userid: any) {

        const token = jwt.sign({ userId: userid }, process.env.JWT_SECRET, { expiresIn: '6h' });

        return token
    }

    async generateRandomPassword(length: number = 6) {
        const charset = '0123456789'; // Only numbers
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        password = "123456"
        return password;
    };

    async getStudentDetails(studentId: any,collegeId:any) {
        try {


            let query = `
            SELECT 
                u.id AS student_id, u.firstname, u.lastname, u.email, 
                u.countrycode, u.mobileno, u.status, 
                cs.college_id, c.name AS college_name,
    
                COALESCE(json_agg(DISTINCT jsonb_build_object(
                    'course_id', co.id,
                    'course_name', co.name
                )) FILTER (WHERE co.id IS NOT NULL), '[]') AS courses,
    
                COALESCE(json_agg(DISTINCT jsonb_build_object(
                    'batch_id', b.id,
                    'batch_name', b.name,
                    'start_date', b.start_date,
                    'end_date', b.end_date
                )) FILTER (WHERE b.id IS NOT NULL), '[]') AS batches
    
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            LEFT JOIN college c ON cs.college_id = c.id
            LEFT JOIN course_students cs2 ON u.id = cs2.student_id
            LEFT JOIN course co ON cs2.course_id = co.id
            LEFT JOIN batch b ON cs2.batch_id = b.id
    
            WHERE r.name = $1 AND u.id = $2
            `;
    
            const params: any[] = ["student", studentId];
    
            if (collegeId !== null) {
                query += ` AND cs.college_id = $3`;
                params.push(collegeId);
            }
    
            query += ` GROUP BY u.id, cs.college_id, c.name`;



            let students: any = await baseRepository.query(query, params);
            return students
        } catch {

        }


    };

    async getTestsAssingedForStudent(studentId: any,batch_id:any) {
        try {
            const query = `
            SELECT 
                t.id AS test_id,
                t.name AS test_name,
                t.duration,
                t.created_at,
                t.start_date,
                t.end_date,
                s.id AS subject_id,
                s.name AS subject_name,
                tr.id AS result_id,
                tr.total_questions,
                tr.attempted,
                tr.correct,
                tr.wrong,
                tr.final_score,
                tr.final_result
            FROM test_batches tb
            INNER JOIN test t ON tb.test_id = t.id
            LEFT JOIN subject s ON t.subject_id = s.id
            LEFT JOIN test_results tr ON t.id = tr.test_id AND tr.user_id = $2
            WHERE tb.batch_id = $1
            ORDER BY t.created_at DESC;
        `;

        const allTests = await baseRepository.query(query, [batch_id, studentId]) as any[];

        const currentTime = Math.floor(Date.now() / 1000); // current UNIX timestamp

        let assignedTests = [];
        let completdTests = [];
        let openTest = [];
        assignedTests=allTests;
        for (const test of allTests) {
            if (test.result_id) {
                completdTests.push(test);
            } else if (test.start_date <= currentTime && currentTime <= test.end_date) {
                openTest.push(test);
            } 
        }

        let tests = {
            assignedTests,
            completdTests,
            openTest
        };



    
            return tests;
        } catch (err) {
            throw err;
        }

    };




}

export default new common()