export interface TestQuestion {
    id: number;
    test_id: number;
    question_id: number;
  }
  
  export const testQuestionsSchema = {
    test_id: { type: 'number', required: true },
    question_id: { type: 'number', required: true },
    unique: ['test_id', 'question_id'] // Ensure no duplicate test-question pairs
  };
  