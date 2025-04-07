// interfaces/batch.interface.ts
export interface Batch {
    id?: number;
    name: string;
    course_id: number;
    start_date: number;
    end_date: number;
    status: string;
    college_id?: number | null; // optional and nullable
  }
  

  // schema/batch.schema.ts

export const batchSchema = {
    name: { type: 'string', required: true },
    course_id: { type: 'number', required: true },
    start_date: { type: 'string', required: true }, // Use 'date' if your validation supports it
    end_date: { type: 'string', required: true },
    status: { type: 'number', required: true },
  };
  