export interface TestBatch {
    test_id: number;
    batch_id: number;
    created_at: number; // Unix timestamp (in seconds)
  }
  export const testBatchSchema = {
    test_id: { type: "integer", notNull: true },
    batch_id: { type: "integer", notNull: true },
    created_at: { type: "bigint", notNull: true }
  };
  