export interface Subject {
    id: number;
    name: string;
    status: number;
  }
  

  export const subjectSchema = {
    name: { type: 'string', required: true },
    status: { type: 'number', required: true },
  };
  