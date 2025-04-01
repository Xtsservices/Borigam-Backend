export interface User {
    id: number;
    user_id:number;
    role_id:number;
   
  }





export const userRolesSchema = {
    user_id: { type: 'number', required: true },
    role_id: { type: 'number', required: true },
  };
  