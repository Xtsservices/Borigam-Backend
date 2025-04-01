export interface User {
    id: number;
    name: string;   
    status:number;

  }


  export const courseSchema = {
    name: { type: 'string', required: true,unique: true },   
    status: { type: 'number', required: true},
  };