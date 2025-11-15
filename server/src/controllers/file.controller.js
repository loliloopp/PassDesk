import s3Client, { bucketName } from '../config/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileKey = `${uuidv4()}${fileExtension}`;

    // Загрузка в Yandex Object Storage
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private' // или 'public-read' если нужен публичный доступ
    };

    const result = await s3Client.upload(uploadParams).promise();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: result.Location
      }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileExtension = path.extname(file.originalname);
      const fileKey = `${uuidv4()}${fileExtension}`;

      const uploadParams = {
        Bucket: bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };

      const result = await s3Client.upload(uploadParams).promise();

      return {
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: result.Location
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files: uploadedFiles
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFile = async (req, res, next) => {
  try {
    const { fileKey } = req.params;

    // Генерация подписанного URL для доступа к файлу
    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Expires: 3600 // URL действителен 1 час
    };

    const url = await s3Client.getSignedUrlPromise('getObject', params);

    res.json({
      success: true,
      data: {
        url
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { fileKey } = req.params;

    const params = {
      Bucket: bucketName,
      Key: fileKey
    };

    await s3Client.deleteObject(params).promise();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

