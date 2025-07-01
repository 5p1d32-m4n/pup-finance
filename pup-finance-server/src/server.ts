import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running in http://localhost:${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});