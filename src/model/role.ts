export interface User {
    id: number;
    name: string;   
    status:number;

  }


  export const roleSchema = {
    name: { type: 'string', required: true,unique: true },   
    status: { type: 'number', required: true},
  };