export interface CollegeUser {
    college_id: number;
    user_id: number;
  }
  
  export const collegeStudentsSchema = {
    college_id: { type: 'number', required: true },
    user_id: { type: 'number', required: true },
  };
  