export interface User {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    countrycode: string;
    mobileno: string;
    hospitalid: number;  // Foreign key reference to the hospital
    roles: string[];     // Array of role IDs
    status: number;
  }
  
  export const userSchema = {
    firstname: { type: 'string', required: true },
    lastname: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    countrycode: { type: 'string', required: true },
    mobileno: { type: 'string', required: true, unique: true },
    hospitalid: { type: 'number', required: false },  // Reference to the hospital table
    roles: { type: 'array', required: false },        // Array of role IDs
    status: { type: 'number', required: true },
  };
  