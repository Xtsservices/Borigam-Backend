export interface Option {
    id: number;
    question_id: number;
    option_text: string;
    is_correct: boolean;
}

export const optionSchema = {
    question_id: { type: 'number', required: true },
    option_text: { type: 'string', required: true },
    is_correct: { type: 'boolean', required: true }
  };
  