export interface Subject {
    id: number;
    name: string;
    course_id:number;
    status: number;
  }
  

  export const subjectSchema = {
    name: { type: 'string', required: true },
    course_id: { type: 'number', required: true },
    status: { type: 'number', required: true },
  };
  