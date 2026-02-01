import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'grievance-files';

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Name of the file
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
const uploadFile = async (fileBuffer, fileName, contentType) => {
    const key = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
    });

    await s3Client.send(command);

    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

/**
 * Upload audit log to S3
 * @param {Object} logData - Log data object
 * @param {string} logType - Type of log (escalation, override, etc.)
 * @returns {Promise<string>} - S3 URL of uploaded log
 */
const uploadAuditLog = async (logData, logType) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `audit-logs/${logType}/${timestamp}.json`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(logData, null, 2),
        ContentType: 'application/json',
    });

    await s3Client.send(command);

    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export { s3Client, uploadFile, uploadAuditLog, BUCKET_NAME };
