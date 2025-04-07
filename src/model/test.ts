export interface Test {
  id: number;
  name: string;
  duration: number;
  course_id: number;
  start_date: number;   // Unix timestamp (seconds)
  end_date: number;     // Unix timestamp (seconds)
  created_at: number;   // Unix timestamp (seconds)
}

  
export const testSchema = {
  id: { type: "serial", primary: true },
  name: { type: "string", notNull: true },
  duration: { type: "integer", notNull: true },
  course_id: { type: "integer", notNull: true },
  start_date: { type: "bigint", notNull: true },   // Unix timestamp
  end_date: { type: "bigint", notNull: true },     // Unix timestamp
  created_at: { type: "bigint", notNull: true }    // Unix timestamp
};

