export interface Login {
    id?: number;
    user_id: number;
    password: string;
  }
  
  export const loginSchema = {
    user_id: { type: 'number', required: true },
    password: { type: 'string', required: true },
  };