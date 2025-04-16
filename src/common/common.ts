import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
import crypto from 'crypto'; // You can use crypto or any other method for generating random strings
import baseRepository from "../repo/baseRepo";
import moment from 'moment-timezone';
moment.tz.setDefault("Asia/Kolkata");
dotenv.config();

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            JWT_SECRET: string;
        }
    }
}




class common {

    async checkendtime(duration: any, start_time: any) {

        try {
            let continuetest = "no";

            let revisedtime = Number(start_time) + Number(duration * 60)
            let now = moment().unix();


            if (Number(now) > Number(revisedtime)) {
                continuetest = "no"
            } else {
                continuetest = "yes"
            }

            return continuetest

        } catch (error) {
            return error
        }



    }

    async gettestStatus(test_id: number, user_id: number) {
        try {

            // Unanswered: questions not answered or not attempted at all
            const unansweredQuery = `
                SELECT COUNT(*) FROM test_questions tq
                WHERE tq.test_id = $1 AND NOT EXISTS (
                    SELECT 1 FROM test_submissions ts
                    WHERE ts.test_id = tq.test_id
                    AND ts.question_id = tq.question_id
                    AND ts.user_id = $2
                    AND ts.status = 'answered'
                )
            `;
            const unansweredRes: any = await baseRepository.query(unansweredQuery, [test_id, user_id]);
            const unansweredCount = parseInt(unansweredRes[0].count);

            return {
                unanswered: unansweredCount
            };
        } catch (err) {
            console.error("Error in gettestStatus", err);
            return {
                open: 0,
                unanswered: 0,
                error: "Failed to fetch status"
            };
        } finally {
        }

    };


    async checkTestDates(test: any) {

        try {
            let now = moment().unix();
            let continuetest = "yes";
            if (now > test.start_date) {
                continuetest = "yes"
            } else {
                continuetest = "no"
            }

            if (now > test.start_date) {
                continuetest = "yes"
            } else {
                continuetest = "no"
            }

            if (now > test.end_date) {
                continuetest = "no"
            } else {
                continuetest = "yes"
            }


            return continuetest

        } catch (error) {
            return error
        }



    }

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
        return password;
    };

    async getStudentDetails(studentId: any, collegeId: any) {
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

    async getTestsAssingedForStudent(studentId: any, batchId: any) {
        try {
            const query = `
                SELECT 
                    t.id AS test_id,
                    t.name AS test_name,
                    t.duration,
                    t.created_at,
                    t.start_date,
                    t.end_date,
                    c.id AS course_id,
                    c.name AS course_name,
                    tr.id AS result_id,
                    tr.total_questions,
                    tr.attempted,
                    tr.correct,
                    tr.wrong,
                    tr.final_score,
                    tr.final_result
                FROM test_batches tb
                INNER JOIN test t ON tb.test_id = t.id
                LEFT JOIN course c ON t.course_id = c.id
                LEFT JOIN test_results tr ON t.id = tr.test_id AND tr.user_id = $2
                WHERE tb.batch_id = $1
                ORDER BY t.created_at DESC;
            `;

            const allTests = await baseRepository.query(query, [batchId, studentId]) as any[];

            const currentTime = Math.floor(Date.now() / 1000); // current UNIX timestamp

            const assignedTests: any[] = allTests;
            const completdTests: any[] = [];
            const openTests: any[] = [];

            for (const test of allTests) {
                console.log(test.start_date, currentTime, test.end_date)
                if (test.result_id) {
                    completdTests.push(test);

                } else if (test.start_date <= currentTime && currentTime <= test.end_date) {
                    openTests.push(test);
                }
            }

            return {
                assignedTests,
                completdTests,
                openTests
            };
        } catch (err) {
            throw err;
        }
    }

    async profile(id: any) {
        try {


            const profileQuery = `
  SELECT 
    u.*, 
    r.name AS role,
    COALESCE(l.change_password, false) AS change_password
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN role r ON ur.role_id = r.id
  LEFT JOIN login l ON u.id = l.user_id::int
  WHERE u.id = $1
`;



          


            const result = await baseRepository.query(profileQuery, [id]);


            return result
        } catch (err) {
            throw err;
        }
    }





}

export default new common()