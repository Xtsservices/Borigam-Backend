import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
import crypto from 'crypto'; // You can use crypto or any other method for generating random strings

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

    async  generateRandomPassword  (length: number = 6) {
        const charset = '0123456789'; // Only numbers
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        password ="123456"
        return password;
      };


  

}

export default new common()