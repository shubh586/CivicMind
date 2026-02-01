import { parse } from 'csv-parse';
import { Readable } from 'stream';


const parseCSV = async (buffer, options = {}) => {
    const records = [];

    const parser = Readable.from(buffer).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            ...options
        })
    );

    for await (const record of parser) {
        records.push(record);
    }

    return records;
};


const validateCSVColumns = (records, requiredColumns) => {
    if (records.length === 0) {
        return {
            valid: false,
            error: 'CSV file is empty'
        };
    }

    const headers = Object.keys(records[0]);
    const missingColumns = requiredColumns.filter(col =>
        !headers.some(h => h.toLowerCase() === col.toLowerCase())
    );

    if (missingColumns.length > 0) {
        return {
            valid: false,
            error: `Missing required columns: ${missingColumns.join(', ')}`
        };
    }

    return { valid: true };
};


const extractComplaintText = (record) => {
    const possibleColumns = [
        'complaint',
        'text',
        'description',
        'complaint_text',
        'issue',
        'problem',
        'message'
    ];

    for (const col of possibleColumns) {
        // Check exact match and case-insensitive
        const key = Object.keys(record).find(k =>
            k.toLowerCase() === col.toLowerCase()
        );

        if (key && record[key]) {
            return record[key].trim();
        }
    }

    return null;
};

export { parseCSV, validateCSVColumns, extractComplaintText };
