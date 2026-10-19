export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/gharproof',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_gharproof_jwt_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
});
