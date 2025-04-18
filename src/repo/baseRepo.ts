import { PoolClient } from 'pg';
import pool from '../database';  // Assuming you have a database pool

async function updateQuestionNameColumn() {
  try {
    await pool.query(`
      ALTER TABLE question
      ALTER COLUMN name TYPE VARCHAR(2000);
    `);
    console.log('✅ Column "name" in table "question" updated to VARCHAR(2000)');
  } catch (err) {
    console.error('❌ Error updating column:', err);
  } finally {
    await pool.end();
  }
}

// updateQuestionNameColumn();

class BaseRepository {
  
  async upsert(
    table: string,
    keys: { user_id: any; test_id: any },
    data: { total_questions: number; attempted: number; correct: number; wrong: number; final_score: string; final_result: string },
    client: PoolClient
  ) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const keyColumns = Object.keys(keys);
      const keyValues = Object.values(keys);
  
      // Combine key and data columns for insert
      const allColumns = [...keyColumns, ...columns];
      const allValues = [...keyValues, ...values];
  
      // Create placeholders for values
      const placeholders = allColumns.map((_, index) => `$${index + 1}`).join(', ');
  
      // Create SET clause for update
      const setClause = columns.map((col, index) => `${col} = $${index + keyColumns.length + 1}`).join(', ');
  
      const query = `
        INSERT INTO ${table} (${allColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (${keyColumns.join(', ')})
        DO UPDATE SET ${setClause}
        RETURNING *;
      `;
  
      const result = await this.query(query, allValues, client);
      return result[0];
    } catch (error: any) {
      console.error('Error executing upsert query:', error);
      throw new Error(`Database upsert failed: ${error.message}`);
    }
  }
  
  async count(
    table: string,
    conditions: Record<string, any>,
    client?: PoolClient
  ): Promise<number> {
    try {
      const conditionStrings = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');
  
      const query = `SELECT COUNT(*) FROM ${table} WHERE ${conditionStrings}`;
      const values = Object.values(conditions);
  
      const result = await this.query<{ count: string }>(query, values, client);
      return parseInt(result[0].count, 10);
    } catch (error: any) {
      console.error('Error executing count query:', error);
      throw new Error(`Database count failed: ${error.message}`);
    }
  }
  

  // Get a client connection for transactions
  async getClient() {
    return await pool.connect();
  }

  // General query method with transaction support
  async query<T>(query: string, values: any[] = [], client?: any): Promise<T[]> {
    try {
      const result = client 
        ? await client.query(query, values) 
        : await pool.query(query, values);
      return result.rows;
    } catch (error:any) {
      console.error('Error executing custom query:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Select method with transaction support
  async select<T>(
    table: string, 
    conditions: Record<string, any>, 
    fields: string[], 
    client?: any
  ): Promise<T[]> {
    try {
      const conditionStrings = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');

      const query = `SELECT ${fields.join(', ')} FROM ${table} WHERE ${conditionStrings}`;
      const values = Object.values(conditions);

      return await this.query<T>(query, values, client);
    } catch (error:any) {
      console.error('Error executing select query:', error);
      throw new Error(`Database select failed: ${error.message}`);
    }
  }

  // Find all rows with optional WHERE clause, supports transaction
  async findAll<T>(
    table: string, 
    where?: Record<string, any>, 
    client?: any
  ): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${table}`;
      let values: any[] = [];

      if (where) {
        const conditions = Object.entries(where)
          .map(([key, value], index) => `${key} = $${index + 1}`)
          .join(' AND ');
        
        query += ` WHERE ${conditions}`;
        values = Object.values(where);
      }

      return await this.query<T>(query, values, client);
    } catch (error :any) {
      console.error('Error executing findAll query:', error);
      throw new Error(`Database findAll failed: ${error.message}`);
    }
  }

  // Find one row with transaction support
  async findOne<T>(
    table: string, 
    condition: string | Record<string, any>, 
    values?: any[], 
    client?: any
  ): Promise<T | null> {
    try {
      let query: string;
      let queryValues: any[] = [];

      if (typeof condition === 'string') {
        query = `SELECT * FROM ${table} WHERE ${condition} LIMIT 1`;
        queryValues = values || [];
      } else {
        const conditions = Object.keys(condition)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');

        query = `SELECT * FROM ${table} WHERE ${conditions} LIMIT 1`;
        queryValues = Object.values(condition);
      }

      const result = await this.query<T>(query, queryValues, client);
      return result[0] || null;
    } catch (error :any) {
      console.error('Error executing findOne query:', error);
      throw new Error(`Database findOne failed: ${error.message}`);
    }
  }

  // Insert a single record with transaction support
  async insert<T>(
    table: string, 
    data: Record<string, any>, 
    schema: Record<string, any>, 
    client?: any
  ): Promise<T> {
    try {
      // Schema validation
      for (const key of Object.keys(schema)) {
        if (schema[key].required && (schema[key] === undefined || schema[key] === null)) {
          throw new Error(`${key} is required`);
        }
      }

      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *`;

      const result = await this.query<T>(query, values, client);
      return result[0];
    } catch (error :any) {
      console.error('Error executing insert query:', error);
      throw new Error(`Database insert failed: ${error.message}`);
    }
  }

  // Insert multiple records with transaction support
  async insertMultiple<T>(
    table: string, 
    data: Record<string, any>[], 
    schema: Record<string, any>, 
    client?: any
  ): Promise<T[]> {
    try {
      // Validate schema for all records
      for (const record of data) {
        for (const key of Object.keys(schema)) {
          // Allow falsy values like false, 0, "", etc. only if they are not explicitly required
          if (schema[key].required && (record[key] === undefined || record[key] === null)) {
            throw new Error(`${key} is required`);
          }
        }
      }
  
      const keys = Object.keys(data[0]);
      const placeholders: string[] = [];
      const values: any[] = [];
  
      data.forEach((record, index) => {
        const valuePlaceholders = keys.map((_, i) => `$${i + 1 + index * keys.length}`).join(', ');
        placeholders.push(`(${valuePlaceholders})`);
        values.push(...Object.values(record));
      });
  
      const query = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES ${placeholders.join(', ')}
        RETURNING *`;
  
      return await this.query<T>(query, values, client);
    } catch (error: any) {
      console.error('Error executing insertMultiple query:', error);
      throw new Error(`Database insertMultiple failed: ${error.message}`);
    }
  }
  

  // Update method with transaction support
  async update<T>(
    table: string,
    condition: string | Record<string, any>,  // Allow condition to be either string or object
    conditionValues: any[],  // Array of values for placeholders in the condition
    data: Record<string, any>,  // Object containing the column-value pairs to update
    client?: any
): Promise<T> {
    try {
        const setClause = Object.keys(data)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');

        const updateValues = Object.values(data);

        let adjustedCondition: string;
        if (typeof condition === 'string') {
            // If condition is already a string, use it as is
            adjustedCondition = condition.replace(/\$(\d+)/g, (_, match) => {
                return `$${parseInt(match) + updateValues.length}`;
            });
        } else if (typeof condition === 'object' && condition !== null) {
            // If condition is an object, build a string condition like "key = $1"
            adjustedCondition = Object.keys(condition)
                .map((key, index) => `${key} = $${index + 1 + updateValues.length}`)
                .join(' AND ');

            // Add condition values (corresponding to the placeholders)
            conditionValues = Object.values(condition);
        } else {
            throw new Error('Invalid condition type. Must be a string or object.');
        }

        const finalValues = [...updateValues, ...conditionValues];

        const query = `
            UPDATE ${table}
            SET ${setClause}
            WHERE ${adjustedCondition}
            RETURNING *`;

        const result = await this.query<T>(query, finalValues, client);
        return result[0];
    } catch (error: any) {
        console.error('Error executing update query:', error);
        throw new Error(`Database update failed: ${error.message}`);
    }
}


  // Delete method with transaction support
async delete(
  table: string,
  conditions: Record<string, any>,
  client?: PoolClient
): Promise<void> {
  try {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);

    const conditionStr = keys.map((key, index) => `${key} = $${index + 1}`).join(" AND ");
    const query = `DELETE FROM ${table} WHERE ${conditionStr}`;

    await this.query(query, values, client);
  } catch (error: any) {
    console.error('Error executing delete query:', error);
    throw new Error(`Database delete failed: ${error.message}`);
  }
}

}

export default new BaseRepository();
