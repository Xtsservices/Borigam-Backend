export interface Question {
    id: number;
    name: string;
    type: 'radio' | 'blank' | 'multiple_choice' | 'text';
    status: number;  // 0 for inactive, 1 for active
    course_id: number;
}

export const questionSchema = {
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['radio', 'blank', 'multiple_choice', 'text'] },
    status: { type: 'number', required: true, enum: [0, 1] },
    course_id: { type: 'number', required: true }
  };
  